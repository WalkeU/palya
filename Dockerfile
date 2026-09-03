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

RUN mkdir -p /app/data

# Runs as root inside the container. A non-root user is nicer in theory,
# but /app/data is normally a host bind mount (see docker-compose.yml),
# and host environments vary too much in how they let a container user
# write into a bind-mounted folder (ownership, SELinux, userns-remap,
# network filesystems, ...) - it repeatedly broke SQLite's ability to
# open its file across different hosts. Root-in-container is still
# isolated by Docker itself, which is the actual security boundary here.
VOLUME ["/app/data"]

EXPOSE 3000
CMD ["node", "server/dist/index.js"]
