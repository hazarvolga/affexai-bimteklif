#!/usr/bin/env bash
# Regenerates fixtures/phase-5/pdfa-matrix in a pinned, network-isolated container.
# Output bytes differ per run (signature time, random key); commit the result together
# with refreshed hashes in fixtures/phase-5/pdfa-matrix/manifest.json.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
IMAGE="python:3.11-slim@sha256:e88e9763f943ec1834f992a4b51e0f24500486803e8bc534e5767af9ea65f6ce"
WHEELS="$(mktemp -d)"
trap 'rm -rf "$WHEELS"' EXIT

docker run --rm -v "$WHEELS:/wheels" "$IMAGE" \
  pip download --quiet --dest /wheels pikepdf==10.17.0 pyHanko==0.37.0 pyhanko-certvalidator==0.32.1 cryptography==50.0.2
docker run --rm --network none \
  -v "$WHEELS:/wheels:ro" \
  -v "$ROOT/scripts/fixtures/pdfa-matrix:/gen:ro" \
  -v "$ROOT/fixtures/phase-0/open-source/verapdf:/src:ro" \
  -v "$ROOT/fixtures/phase-5/pdfa-matrix:/out" \
  "$IMAGE" sh -c 'pip install --quiet --no-index --find-links /wheels pikepdf==10.17.0 pyHanko==0.37.0 pyhanko-certvalidator==0.32.1 cryptography==50.0.2 \
    && python -I /gen/generate.py --source-dir /src --out-dir /out \
    && chown -R '"$(id -u):$(id -g)"' /out'
