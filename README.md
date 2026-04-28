# kvm-router

A self-hosted reverse proxy dashboard for KVM/Proxmox (and any web-based management interface). Run it as a single Docker container and access all your hypervisors through one clean UI on a single port.

## Features

- **Reverse proxy** — each host is served under `/kvm/<slug>/`, so you only need one port open
- **WebRTC & console-ready** — WebSocket upgrade, streaming-optimised proxy settings, per-host upload size limits for ISO/image uploads
- **Web UI** — React + MUI dark theme dashboard; open any host in a dedicated browser tab (clicking again refocuses the same tab)
- **Admin panel** — add, edit, reorder, and delete hosts without touching config files
- **JWT authentication** — login-gated; tokens expire after 12 hours
- **Single container** — nginx + Node.js API + React UI managed by supervisord; SQLite for persistence
- **GitHub Actions CI** — builds and pushes multi-arch images to Docker Hub on every push to `main`

## Quick Start

### Docker Compose (recommended)

```yaml
services:
  kvm-router:
    image: clinta74/kvm-router:latest
    container_name: kvm-router
    ports:
      - "6080:80"
    volumes:
      - kvm-data:/data
    environment:
      JWT_SECRET: replace-with-a-long-random-string
      DB_PATH: /data/kvm.db
      # Optional: pre-seed first admin on first run
      # ADMIN_USERNAME: admin
      # ADMIN_PASSWORD: changeme
    restart: unless-stopped

volumes:
  kvm-data:
```

```bash
docker compose up -d
```

Open `http://<your-host>:6080`. On first run you will be redirected to a setup page to create the admin account (unless you pre-seeded via env vars).

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `JWT_SECRET` | **Yes** | — | Secret key used to sign JWT tokens. Use a long random string. |
| `DB_PATH` | No | `/data/kvm.db` | Path to the SQLite database file. |
| `ADMIN_USERNAME` | No | — | Pre-seed an admin username on first run. |
| `ADMIN_PASSWORD` | No | — | Pre-seed an admin password on first run. |

## Adding KVM Hosts

1. Log in and go to **Admin** (top-right menu).
2. Click **Add Host**.
3. Fill in:
   - **Name** — display label on the dashboard
   - **Slug** — URL-safe identifier; the host will be reachable at `/kvm/<slug>/`
   - **URL** — full URL of the management interface (e.g. `https://192.168.1.10:8006` for Proxmox)
   - **Max Upload Size** — nginx `client_max_body_size` for this host (e.g. `10g` for large ISO uploads)
4. Save. The nginx config is regenerated immediately — no restart needed.

## How It Works

```
Browser → nginx (:80) → /kvm/<slug>/ → proxy_pass → your KVM host
                      → /api/        → Node.js API (:3001)
                      → /            → React SPA
```

- The Node.js API writes `/etc/nginx/kvm-hosts.conf` whenever hosts change and sends `nginx -s reload`.
- On container startup the config is also regenerated so it survives volume-less restarts.
- Location blocks use the `^~` prefix modifier so nginx doesn't attempt to serve proxied paths from the local filesystem.

## Building Locally

```bash
docker build -t kvm-router .
docker run -p 6080:80 -e JWT_SECRET=devsecret kvm-router
```

## CI / Docker Hub

Pushes to `main` automatically build and publish `clinta74/kvm-router:latest` via GitHub Actions. Version tags (`v1.2.3`) also publish `1.2.3` and `1.2` tags.

Add these secrets to the GitHub repository (`Settings → Secrets → Actions`):

| Secret | Value |
|---|---|
| `DOCKERHUB_USERNAME` | `clinta74` |
| `DOCKERHUB_TOKEN` | Docker Hub access token |

## Security Notes

- Always set `JWT_SECRET` to a strong random value in production.
- The proxy sets `proxy_ssl_verify off` to support self-signed certificates on local hypervisors. Do not expose this service on the public internet without additional hardening.
- Security headers (`X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy`) are set on all responses.
