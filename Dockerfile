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
    && pnpm exec esbuild src/smartcheck/import/ifc-worker.ts --bundle --platform=node --format=esm --packages=external --outfile=dist/ifc-worker.mjs

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
COPY --from=build --chown=node:node /app/package.json ./package.json
USER node
EXPOSE 3000
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/server.cjs"]

FROM runtime AS worker
CMD ["node", "dist/worker.mjs"]

FROM runtime AS ifc-worker
CMD ["node", "dist/ifc-worker.mjs"]

FROM runtime AS app
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health',{signal:AbortSignal.timeout(4000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
