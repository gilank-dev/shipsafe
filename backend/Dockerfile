# ShipSafe Backend API — multi-stage build
# Build context: repository ROOT (npm workspaces), e.g.:
#   docker build -f backend/Dockerfile -t shipsafe-backend .
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY cli/package.json cli/
COPY mcp/package.json mcp/
RUN npm ci

COPY backend/ backend/
RUN npm run build -w backend \
    && npm prune --omit=dev

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Run as non-root
USER node

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/backend/package.json ./package.json

EXPOSE 23010
CMD ["node", "dist/server.js"]
