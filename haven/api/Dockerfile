FROM node:22-alpine AS builder
WORKDIR /repo
RUN npm install -g pnpm@11.17.0

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY haven/shared/package.json haven/shared/package.json
COPY haven/api/package.json haven/api/package.json
RUN pnpm install --frozen-lockfile --filter @uniquedev/haven-api...

COPY haven/shared haven/shared
COPY haven/api haven/api
RUN pnpm --filter @uniquedev/haven-shared build && pnpm --filter @uniquedev/haven-api build

FROM node:22-alpine
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=builder /repo/package.json /repo/pnpm-workspace.yaml ./
COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/haven/shared/package.json ./haven/shared/package.json
COPY --from=builder /repo/haven/shared/dist ./haven/shared/dist
COPY --from=builder /repo/haven/shared/node_modules ./haven/shared/node_modules
COPY --from=builder /repo/haven/api/package.json ./haven/api/package.json
COPY --from=builder /repo/haven/api/dist ./haven/api/dist
COPY --from=builder /repo/haven/api/node_modules ./haven/api/node_modules
COPY --from=builder /repo/haven/api/drizzle ./haven/api/drizzle
WORKDIR /repo/haven/api
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
