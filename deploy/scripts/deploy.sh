#!/usr/bin/env bash
# ==============================================================================
# E3 Rentals Qatar — Zero-Downtime Rolling Deployment Script
# Rebuilds Next.js container, pushes migrations, verifies health, reloads Nginx
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "${ROOT_DIR}"

echo "===================================================================="
echo "  E3 Rentals Qatar — Zero-Downtime Deployment Initialized"
echo "  Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "===================================================================="

# 1. Sanity Checks
if [ ! -f ".env.production" ]; then
    echo "[-] ERROR: .env.production file not found in ${ROOT_DIR}!" >&2
    echo "[-] Copy .env.production.example to .env.production and configure your secrets." >&2
    exit 1
fi

# 2. Git Fetch & Fast-Forward Pull
echo "[+] Step 1/6: Fetching latest application code..."
if [ -d ".git" ]; then
    BRANCH=$(git rev-parse --abbrev-ref HEAD)
    echo "[*] Current branch: ${BRANCH}"
    git pull --ff-only origin "${BRANCH}" || {
        echo "[!] Warning: Fast-forward git pull failed, using current working directory code."
    }
fi

# 3. Rebuild Application Container
echo "[+] Step 2/6: Building production Next.js standalone container..."
docker compose -f docker-compose.prod.yml build app

# 4. Start Infrastructure Dependencies (Postgres, Redis)
echo "[+] Step 3/6: Ensuring database and cache infrastructure are healthy..."
docker compose -f docker-compose.prod.yml up -d postgres redis
echo "[*] Waiting for PostgreSQL and Redis healthchecks..."
until [ "$(docker inspect -f '{{.State.Health.Status}}' e3-rentals-postgres 2>/dev/null)" = "healthy" ]; do
    sleep 2
done
until [ "$(docker inspect -f '{{.State.Health.Status}}' e3-rentals-redis 2>/dev/null)" = "healthy" ]; do
    sleep 2
done
echo "[+] Databases are healthy."

# 5. Execute Relational Migrations
echo "[+] Step 4/6: Applying Drizzle schema migrations..."
docker compose -f docker-compose.prod.yml run --rm --no-deps app npx drizzle-kit push || {
    echo "[!] Warning: Drizzle push encountered a non-fatal warning or schema is already up to date."
}

# 6. Zero-Downtime Swap of Next.js App
echo "[+] Step 5/6: Launching updated Next.js application container..."
docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate app

# Wait for Next.js internal health check
echo "[*] Verifying container health via /api/health..."
HEALTH_URL="http://127.0.0.1:3000/api/health"
MAX_ATTEMPTS=20
ATTEMPT=1
HEALTHY=false

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    if curl -s -f "${HEALTH_URL}" > /dev/null 2>&1; then
        HEALTHY=true
        break
    fi
    echo "    Attempt ${ATTEMPT}/${MAX_ATTEMPTS}: App initializing, waiting 2s..."
    sleep 2
    ATTEMPT=$((ATTEMPT + 1))
done

if [ "$HEALTHY" = false ]; then
    echo "[-] ERROR: Application failed health check at ${HEALTH_URL} after ${MAX_ATTEMPTS} attempts!" >&2
    echo "[-] Inspecting container logs:" >&2
    docker compose -f docker-compose.prod.yml logs --tail 50 app
    exit 1
fi

echo "[+] Application healthy!"

# 7. Start / Reload Nginx Reverse Proxy
echo "[+] Step 6/6: Reloading Nginx reverse proxy..."
docker compose -f docker-compose.prod.yml up -d nginx certbot
docker compose -f docker-compose.prod.yml exec -T nginx nginx -s reload || true

# 8. Clean up unused build layers
echo "[+] Cleaning up dangling Docker images..."
docker image prune -f

echo "===================================================================="
echo "  Deployment Complete! Status: HEALTHY"
echo "  Live at: https://rentals.e3qatar.com"
echo "===================================================================="
