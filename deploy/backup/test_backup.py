import importlib.util
import os
import pathlib
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('backup', pathlib.Path(__file__).with_name('backup.py'))
backup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backup)

class BackupTests(unittest.TestCase):
    def env(self):
        return dict(BACKUP_S3_BUCKET='bimmetraj-backups', BACKUP_S3_ENDPOINT='https://account.r2.cloudflarestorage.com',
                    BACKUP_S3_ACCESS_KEY_ID='SECRET_ACCESS', BACKUP_S3_SECRET_ACCESS_KEY='SECRET_KEY',
                    PGUSER='bimmetraj_backup', PGPASSWORD='SECRET_DB')

    def test_missing_config_fails_before_commands(self):
        with patch.dict(os.environ, {}, clear=True), patch.object(backup, 'run') as run:
            with self.assertRaisesRegex(backup.BackupError, 'configuration'):
                backup.execute(pathlib.Path('/unused'))
            run.assert_not_called()

    def test_wrong_target_and_path_rejected(self):
        for key, value in [('PGDATABASE', 'postgres'), ('PGHOST', 'other'), ('PGUSER', 'bimmetraj'), ('PGUSER', 'bimmetraj_owner'), ('BACKUP_S3_PREFIX', '../other'), ('BACKUP_S3_BUCKET', 'bad/bucket'), ('BACKUP_S3_ENDPOINT', 'http://unsafe')]:
            with patch.dict(os.environ, {**self.env(), key: value}, clear=True):
                with self.assertRaises(backup.BackupError): backup.configuration()

    def test_dump_failure_prevents_upload_and_retention(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, self.env(), clear=True), patch.object(backup, 'run', side_effect=backup.BackupError('command failed')) as run, patch.object(backup, 'retention') as retention:
            with self.assertRaises(backup.BackupError): backup.execute(pathlib.Path(directory))
            self.assertEqual(run.call_args.args[0][0], 'pg_dump')
            retention.assert_not_called()
            self.assertFalse(any(pathlib.Path(directory).glob('*.dump')))

    def test_subprocess_errors_are_redacted(self):
        import subprocess
        with patch('subprocess.run', side_effect=subprocess.CalledProcessError(1, ['secret'], stderr='SECRET_DB')):
            with self.assertRaisesRegex(backup.BackupError, '^backup command failed$'):
                backup.run(['pg_dump'], {})

    def test_upload_verification_gates_manifest_and_retention(self):
        for corrupt in [True, False]:
            calls = []
            def command(args, env):
                calls.append(args)
                if args[0] == 'pg_dump': pathlib.Path(args[-1]).write_bytes(b'PGDMP-fixture')
                if 'cp' in args and args[-2].endswith('.verify'):
                    pathlib.Path(args[-2]).write_bytes(b'corrupted' if corrupt else b'PGDMP-fixture')
                if 'head-object' in args:
                    manifest = next(pathlib.Path(directory).glob('*.json'))
                    return ('{"ContentLength": %d}' % manifest.stat().st_size).encode()
                return b'{}'
            with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, self.env(), clear=True), patch.object(backup, 'run', side_effect=command), patch.object(backup, 'retention') as retention:
                if corrupt:
                    with self.assertRaisesRegex(backup.BackupError, 'checksum'): backup.execute(pathlib.Path(directory))
                    retention.assert_not_called()
                    self.assertFalse(any('put-object' in args for args in calls))
                    self.assertFalse(any(pathlib.Path(directory).glob('*.dump')))
                    self.assertFalse(any(pathlib.Path(directory).glob('*.json')))
                else:
                    backup.execute(pathlib.Path(directory))
                    retention.assert_called_once()
                self.assertFalse(any(pathlib.Path(directory).glob('*.verify')))

    def test_retention_never_deletes_foreign_keys_or_symlinks(self):
        import datetime
        own = 'bimmetraj_production_20200101T000000Z_' + 'a' * 32 + '.dump'
        calls = []
        def command(args, env):
            calls.append(args)
            if 'list-objects-v2' in args:
                import json
                return json.dumps({'Contents': [{'Key': key} for key in [backup.PREFIX + own, 'another/' + own, backup.PREFIX + '../' + own, backup.PREFIX + 'foreign.dump']]}).encode()
            return b'{}'
        with tempfile.TemporaryDirectory() as directory, patch.object(backup, 'run', side_effect=command):
            root = pathlib.Path(directory)
            target = root / 'important'; target.write_text('keep')
            (root / own).symlink_to(target)
            backup.retention(root, ['aws'], {}, 'bimmetraj-backups', datetime.datetime.now(datetime.timezone.utc))
            self.assertTrue(target.exists())
            self.assertTrue((root / own).is_symlink())
            deleted = [args[-1] for args in calls if 'delete-object' in args]
            self.assertEqual(deleted, [backup.PREFIX + own])

if __name__ == '__main__': unittest.main()
