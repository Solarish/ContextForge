FROM node:22-slim AS build

WORKDIR /app
COPY gateway/package.json gateway/package-lock.json* ./
RUN npm ci
COPY gateway/tsconfig.json ./tsconfig.json
COPY gateway/src ./src
COPY gateway/public ./public
COPY workspace/projects.json ./workspace/projects.json
RUN npm run build

FROM node:22-slim

WORKDIR /app
ENV NODE_ENV=production
ENV CONTEXTFORGE_PROJECTS_FILE=/app/workspace/projects.json
ENV CONTEXTFORGE_STATE_ROOT=/data/state
ENV PORT=8787

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json* ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY --from=build /app/workspace ./workspace

EXPOSE 8787
CMD ["node", "dist/server.js"]

