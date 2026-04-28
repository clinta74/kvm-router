# Stage 1: Build the API
FROM node:22-alpine AS api-builder
WORKDIR /build/api
COPY api/package*.json ./
RUN npm ci
COPY api/ ./
RUN npm run build

# Stage 2: Build the UI
FROM node:22-alpine AS ui-builder
WORKDIR /build/ui
COPY ui/package*.json ./
RUN npm ci
COPY ui/ ./
RUN npm run build

# Stage 3: Runtime — nginx + Node.js in a single container
FROM node:22-alpine AS runtime

# Install nginx and supervisor
RUN apk add --no-cache nginx supervisor \
    && mkdir -p /var/log/supervisor /var/run /data /etc/nginx/conf.d

# nginx config
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/kvm-hosts.conf /etc/nginx/kvm-hosts.conf

# React SPA
COPY --from=ui-builder /build/ui/dist /usr/share/nginx/html

# Node.js API — compiled JS + production node_modules
WORKDIR /app/api
COPY --from=api-builder /build/api/dist ./dist
COPY api/package*.json ./
RUN npm ci --omit=dev

# Supervisor config
COPY supervisord.conf /etc/supervisord.conf

# Ensure nginx can reload without root by making kvm-hosts.conf writable
RUN chmod 666 /etc/nginx/kvm-hosts.conf \
    && chown -R nginx:nginx /usr/share/nginx/html

# Persistent data volume for SQLite database
VOLUME ["/data"]

EXPOSE 80

CMD ["supervisord", "-c", "/etc/supervisord.conf"]
