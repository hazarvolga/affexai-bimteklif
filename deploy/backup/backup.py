#!/usr/bin/python3
"""Consistent PostgreSQL dump, verified R2 copy, then scoped retention."""
import datetime as dt
import fcntl
import hashlib
import json
import os
import pathlib
import re
import subprocess
import sys
import uuid

class BackupError(Exception):
    pass

PREFIX = 'bimmetraj/postgres/'
NAME = re.compile(r'^bimmetraj_production_(\d{8}T\d{6}Z)_[a-f0-9]{32}\.(dump|json)$')

def configuration():
    e = os.environ
    bucket = e.get('BACKUP_S3_BUCKET', '')
    endpoint = e.get('BACKUP_S3_ENDPOINT', '')
    if (not re.fullmatch(r'bimmetraj-backups(?:-[a-z0-9-]+)?', bucket)
        or not re.fullmatch(r'https://[a-z0-9-]+\.r2\.cloudflarestorage\.com', endpoint)
        or e.get('BACKUP_S3_PREFIX', PREFIX) != PREFIX
        or e.get('PGHOST', 'postgres') != 'postgres'
        or e.get('PGDATABASE', 'bimmetraj_production') != 'bimmetraj_production'
        or e.get('PGUSER', '') != 'bimmetraj_backup'
        or e.get('PGPORT', '5432') != '5432'
        or not all(e.get(k) for k in ['PGPASSWORD', 'BACKUP_S3_ACCESS_KEY_ID', 'BACKUP_S3_SECRET_ACCESS_KEY'])):
        raise BackupError('invalid or missing backup configuration')
    # Do not inherit PG service/options, AWS profiles or credential providers.
    env = dict(PATH=os.defpath, HOME='/tmp', PGHOST='postgres', PGPORT='5432',
               PGDATABASE='bimmetraj_production', PGUSER='bimmetraj_backup', PGPASSWORD=e['PGPASSWORD'],
               PGCONNECT_TIMEOUT='10', AWS_ACCESS_KEY_ID=e['BACKUP_S3_ACCESS_KEY_ID'],
               AWS_SECRET_ACCESS_KEY=e['BACKUP_S3_SECRET_ACCESS_KEY'], AWS_DEFAULT_REGION='auto',
               AWS_EC2_METADATA_DISABLED='true', AWS_CONFIG_FILE='/dev/null',
               AWS_SHARED_CREDENTIALS_FILE='/dev/null', AWS_PAGER='', AWS_RETRY_MODE='standard', AWS_MAX_ATTEMPTS='3')
    return bucket, endpoint, env

def run(args, env):
    try:
        return subprocess.run(args, env=env, check=True, stdout=subprocess.PIPE,
                              stderr=subprocess.PIPE, timeout=900).stdout
    except (subprocess.SubprocessError, OSError):
        raise BackupError('backup command failed') from None

def digest(path):
    result = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            result.update(chunk)
    return result.hexdigest()

def retention(directory, aws, env, bucket, now):
    # Delete only generated immutable keys under the fixed product prefix.
    objects = json.loads(run(aws + ['list-objects-v2', '--bucket', bucket, '--prefix', PREFIX], env))
    remote_cutoff = now - dt.timedelta(days=14)
    for item in objects.get('Contents', []):
        key = item['Key']
        if not key.startswith(PREFIX): continue
        match = NAME.fullmatch(key[len(PREFIX):])
        if match and dt.datetime.strptime(match[1], '%Y%m%dT%H%M%SZ').replace(tzinfo=dt.timezone.utc) < remote_cutoff:
            run(aws + ['delete-object', '--bucket', bucket, '--key', key], env)
    local_cutoff = now - dt.timedelta(days=7)
    for path in directory.iterdir():
        match = NAME.fullmatch(path.name)
        if match and not path.is_symlink() and path.is_file() and dt.datetime.strptime(match[1], '%Y%m%dT%H%M%SZ').replace(tzinfo=dt.timezone.utc) < local_cutoff:
            path.unlink()

def execute(directory=pathlib.Path('/backups')):
    bucket, endpoint, env = configuration()
    os.umask(0o077)
    directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    with (directory / '.backup.lock').open('a') as lock:
        try: fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError: raise BackupError('backup already running') from None
        now = dt.datetime.now(dt.timezone.utc)
        stem = 'bimmetraj_production_' + now.strftime('%Y%m%dT%H%M%SZ') + '_' + uuid.uuid4().hex
        dump = directory / (stem + '.dump')
        partial = directory / (stem + '.partial')
        verify = directory / (stem + '.verify')
        manifest = directory / (stem + '.json')
        aws = ['aws', '--endpoint-url', endpoint, 's3api']
        completed = False
        try:
            run(['pg_dump', '--format=custom', '--no-owner', '--no-acl', '--file', str(partial)], env)
            if not partial.is_file() or partial.stat().st_size == 0: raise BackupError('empty backup')
            run(['pg_restore', '--list', str(partial)], env)
            partial.rename(dump)
            checksum = digest(dump)
            manifest.write_text(json.dumps(dict(database='bimmetraj_production', createdAt=now.isoformat(),
                sha256=checksum, bytes=dump.stat().st_size, format='pg_dump-custom', postgresMajor=16)) + '\n')
            # Upload and download the full dump before publishing its completion manifest.
            # aws s3 cp supports multipart uploads, unlike s3api put-object's 5GB limit.
            run(['aws', '--endpoint-url', endpoint, 's3', 'cp', str(dump), 's3://' + bucket + '/' + PREFIX + dump.name, '--only-show-errors'], env)
            run(['aws', '--endpoint-url', endpoint, 's3', 'cp', 's3://' + bucket + '/' + PREFIX + dump.name, str(verify), '--only-show-errors'], env)
            if digest(verify) != checksum: raise BackupError('remote backup checksum mismatch')
            run(aws + ['put-object', '--bucket', bucket, '--key', PREFIX + manifest.name, '--body', str(manifest)], env)
            remote_manifest = json.loads(run(aws + ['head-object', '--bucket', bucket, '--key', PREFIX + manifest.name], env))
            if remote_manifest.get('ContentLength') != manifest.stat().st_size: raise BackupError('remote manifest verification failed')
            retention(directory, aws, env, bucket, now)
            completed = True
            print(json.dumps(dict(status='success', key=PREFIX + dump.name, sha256=checksum, bytes=dump.stat().st_size)))
        finally:
            if not completed:
                dump.unlink(missing_ok=True)
                manifest.unlink(missing_ok=True)
            partial.unlink(missing_ok=True)
            verify.unlink(missing_ok=True)

if __name__ == '__main__':
    try: execute()
    except Exception:
        # Command output/exception text may contain credentials or tenant data.
        print('Bimmetraj backup failed; check configuration, storage capacity and connectivity.', file=sys.stderr)
        sys.exit(1)
