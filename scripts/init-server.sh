#!/bin/bash
set -e

DOMAIN="testaiassist.site"
EMAIL="${CERTBOT_EMAIL:-admin@$DOMAIN}"

# Auto-detect project root (where docker-compose.yml lives)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== MedAI Server Init ==="
echo "Domain: $DOMAIN"
echo "Deploy dir: $DEPLOY_DIR"

cd "$DEPLOY_DIR"

if [ ! -f "docker-compose.yml" ]; then
  echo "ERROR: docker-compose.yml not found in $DEPLOY_DIR"
  exit 1
fi

if [ ! -f ".env" ]; then
  echo "ERROR: .env file not found in $DEPLOY_DIR"
  echo "Create it first: cp .env.example .env && nano .env"
  exit 1
fi

# 1. Start nginx with HTTP-only config for ACME challenge
echo ""
echo "--- Step 1: Starting nginx for certificate challenge ---"

# Temporary nginx config (HTTP only, no SSL)
mkdir -p nginx
cat > nginx/nginx.conf << 'NGINX'
server {
    listen 80;
    server_name testaiassist.site;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'MedAI — waiting for SSL certificate...';
        add_header Content-Type text/plain;
    }
}
NGINX

docker compose --env-file .env up -d --no-deps nginx

echo "Waiting for nginx..."
sleep 3

# 2. Get SSL certificate
echo ""
echo "--- Step 2: Requesting SSL certificate ---"

docker compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN"

# 3. Restore full nginx config with SSL
echo ""
echo "--- Step 3: Restoring full nginx config ---"

cat > nginx/nginx.conf << 'NGINX'
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 80;
    server_name testaiassist.site;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name testaiassist.site;

    ssl_certificate     /etc/letsencrypt/live/testaiassist.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/testaiassist.site/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    client_max_body_size 20M;

    location / {
        proxy_pass http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_redirect off;
        proxy_read_timeout 86400;
    }
}
NGINX

# 4. Restart nginx with SSL config + start postgres
echo ""
echo "--- Step 4: Starting postgres + reloading nginx ---"

docker compose --env-file .env up -d --no-deps postgres
docker compose --env-file .env up -d --no-deps --force-recreate nginx

echo "Waiting for postgres..."
sleep 5

# 5. Try to start app (may fail if image not yet pushed to GHCR)
echo ""
echo "--- Step 5: Starting app ---"

if docker compose --env-file .env up -d app 2>/dev/null; then
  echo "Waiting for app..."
  sleep 10

  # 6. Run migrations
  echo ""
  echo "--- Step 6: Running database migrations ---"
  docker compose exec -T app npx prisma db push --skip-generate
else
  echo ""
  echo "WARNING: App image not found in registry."
  echo "Push a git tag to trigger the first build:"
  echo "  git tag v1.0.0 && git push origin v1.0.0"
  echo ""
  echo "After the GitHub Action completes, run:"
  echo "  cd $DEPLOY_DIR && docker compose --env-file .env up -d"
fi

# 7. Set up auto-renewal cron
echo ""
echo "--- Step 7: Setting up certificate auto-renewal ---"

CRON_JOB="0 3 * * * cd $DEPLOY_DIR && docker compose run --rm certbot renew --quiet && docker compose exec -T nginx nginx -s reload"
(crontab -l 2>/dev/null | grep -v certbot; echo "$CRON_JOB") | crontab -

echo ""
echo "=== Done! ==="
echo "Open https://$DOMAIN in your browser"
