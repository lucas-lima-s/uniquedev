FROM node:22-alpine AS web-builder
WORKDIR /repo
RUN npm install -g pnpm@11.17.0

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY haven/shared/package.json haven/shared/package.json
COPY haven/web/package.json haven/web/package.json
RUN pnpm install --frozen-lockfile --filter @uniquedev/haven-web...

COPY haven/shared haven/shared
COPY haven/web haven/web
RUN pnpm --filter @uniquedev/haven-shared build
RUN pnpm --filter @uniquedev/haven-web build

FROM caddy:2-alpine
COPY infra/caddy/Caddyfile /etc/caddy/Caddyfile
COPY portfolio/ /srv/site/
COPY --from=web-builder /repo/haven/web/dist /srv/site/haven
