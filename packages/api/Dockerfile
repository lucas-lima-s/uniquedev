FROM node:22-alpine AS builder
WORKDIR /repo
RUN npm install -g pnpm@11.17.0

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/api/package.json packages/api/package.json
RUN pnpm install --frozen-lockfile --filter @haven/api...

COPY packages/shared packages/shared
COPY packages/api packages/api
RUN pnpm --filter @haven/shared build && pnpm --filter @haven/api build

FROM node:22-alpine
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=builder /repo/package.json /repo/pnpm-workspace.yaml ./
COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /repo/packages/shared/dist ./packages/shared/dist
COPY --from=builder /repo/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=builder /repo/packages/api/package.json ./packages/api/package.json
COPY --from=builder /repo/packages/api/dist ./packages/api/dist
COPY --from=builder /repo/packages/api/node_modules ./packages/api/node_modules
COPY --from=builder /repo/packages/api/drizzle ./packages/api/drizzle
WORKDIR /repo/packages/api
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
