FROM node:22-alpine AS web-builder
WORKDIR /repo
RUN npm install -g pnpm@11.17.0

ARG BASE_PATH=/
ENV VITE_BASE_PATH=${BASE_PATH}

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/web/package.json packages/web/package.json
RUN pnpm install --frozen-lockfile --filter @haven/web...

COPY packages/shared packages/shared
COPY packages/web packages/web
RUN pnpm --filter @haven/shared build
RUN pnpm --filter @haven/web build

FROM caddy:2-alpine
COPY infra/caddy/Caddyfile /etc/caddy/Caddyfile
COPY infra/caddy/Caddyfile.subpath /etc/caddy/Caddyfile.subpath
COPY --from=web-builder /repo/packages/web/dist /srv/site
