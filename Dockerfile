# syntax=docker/dockerfile:1
FROM node:24.18.0-bookworm-slim AS dependencies
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm install --global pnpm@11.17.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM dependencies AS build
COPY . .
RUN pnpm run build \
    && pnpm exec esbuild src/smartcheck/import/worker.ts --bundle --platform=node --format=esm --packages=external --outfile=dist/worker.mjs \
    && pnpm exec esbuild src/smartcheck/import/ifc-worker.ts --bundle --platform=node --format=esm --packages=external --outfile=dist/ifc-worker.mjs \
    && pnpm exec esbuild scripts/bootstrap-plan-catalog.ts --bundle --platform=node --format=esm --packages=external --outfile=dist/bootstrap-plan-catalog.mjs \
    && pnpm exec esbuild scripts/bootstrap-pricing-source-catalog.ts --bundle --platform=node --format=esm --packages=external --outfile=dist/bootstrap-pricing-source-catalog.mjs \
    && pnpm exec esbuild scripts/release-migrations/cli.ts --bundle --platform=node --format=esm --packages=external --outfile=dist/release-cli.mjs
# Coolify passes the deployed commit; it is stamped into the image so /api/health cannot drift (P0-4).
# Declared after the build so a new commit only re-runs this layer, not the whole build.
ARG SOURCE_COMMIT=""
RUN SOURCE_COMMIT="$SOURCE_COMMIT" node -e "require('fs').writeFileSync('dist/build-info.json', JSON.stringify({ revision: process.env.SOURCE_COMMIT || null, builtAt: new Date().toISOString() }))"

FROM dependencies AS production-dependencies
RUN pnpm prune --prod --ignore-scripts

FROM node:24.18.0-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
RUN apt-get update \
    && apt-get install --no-install-recommends -y chromium chromium-sandbox fonts-dejavu-core ca-certificates tini \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/drizzle-release ./drizzle-release
COPY --from=build --chown=node:node /app/package.json ./package.json
USER node
EXPOSE 3000
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/server.cjs"]

FROM runtime AS worker
CMD ["node", "dist/worker.mjs"]

FROM runtime AS migrate
CMD ["node", "dist/release-cli.mjs", "apply"]

FROM node:24.18.0-bookworm-slim AS ifc-runtime
ENV NODE_ENV=production \
    PYTHON_BIN=/opt/venv/bin/python3 \
    PATH="/opt/venv/bin:$PATH"
RUN apt-get update \
    && apt-get install --no-install-recommends -y python3 python3-venv python3-pip ca-certificates tini \
    && python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir ifcopenshell==0.8.4.post1 ifctester==0.8.4 pypdf==6.19.0 pytest \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/drizzle-release ./drizzle-release
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --chown=node:node workers/ifc ./workers/ifc
USER node
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/ifc-worker.mjs"]

FROM ifc-runtime AS ifc-worker

FROM runtime AS app
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/readyz',{signal:AbortSignal.timeout(4000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

