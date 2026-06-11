# Build context = monorepo root.
FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @logi/shared build && pnpm --filter api build

FROM node:20-alpine AS runtime
RUN corepack enable
WORKDIR /repo
ENV NODE_ENV=production
ENV PORT=3001
# Copy the built workspace (dist, data CSV, node_modules) from the build stage.
COPY --from=build /repo /repo
WORKDIR /repo/apps/api
EXPOSE 3001
CMD ["node", "dist/src/main.js"]
