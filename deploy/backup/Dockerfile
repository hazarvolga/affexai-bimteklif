FROM postgres:16-bookworm
RUN apt-get update \
    && apt-get install --no-install-recommends -y python3 awscli ca-certificates tini \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --uid 10001 --create-home backup-runner \
    && mkdir -p /backups \
    && chown 10001:10001 /backups
COPY --chmod=0555 backup.py /usr/local/bin/bimmetraj-backup
USER 10001:10001
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sleep", "infinity"]
