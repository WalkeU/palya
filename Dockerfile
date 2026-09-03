# --- Stage 1: build client (React + Vite) ---
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# --- Stage 2: build server (TypeScript) ---
FROM node:20-alpine AS server-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# --- Stage 3: production runtime ---
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

COPY --from=server-build /app/server/dist ./server/dist
COPY --from=client-build /app/client-dist ./client-dist

RUN mkdir -p /app/data && \
    addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app

USER appuser
VOLUME ["/app/data"]

EXPOSE 3000
CMD ["node", "server/dist/index.js"]
