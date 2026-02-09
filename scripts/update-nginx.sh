#!/bin/bash
set -e

echo "========================================="
echo "Update Nginx Configuration for Docker"
echo "========================================="

REMOTE_HOST="izcy-engine"
NGINX_CONFIG="/etc/nginx/sites-available/zai.izcy.tech"
BACKUP_CONFIG="/etc/nginx/sites-available/zai.izcy.tech.backup-$(date +%Y%m%d-%H%M%S)"

echo "Creating Nginx configuration update..."
ssh "$REMOTE_HOST" << 'ENDSSH'
set -e

# Backup existing configuration
echo "Backing up existing Nginx configuration..."
sudo cp "$NGINX_CONFIG" "$BACKUP_CONFIG"

# Create new configuration
echo "Creating new Nginx configuration..."
sudo tee "$NGINX_CONFIG" > /dev/null << 'EOF'
# Rate limiting zones
limit_req_zone \$binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=auth_limit:10m rate=5r/s;

# Upstreams for Docker containers
upstream backend {
    least_conn;
    server 127.0.0.1:5000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

upstream frontend {
    least_conn;
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name zai.izcy.tech;

    # Allow Let's Encrypt ACME challenge
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/certbot;
        default_type "text/plain";
    }

    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name zai.izcy.tech;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/zai.izcy.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/zai.izcy.tech/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/zai.access.log;
    error_log /var/log/nginx/zai.error.log;

    # Client body size limit
    client_max_body_size 10M;

    # Backend API routes
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;

        proxy_pass http://backend;
        proxy_http_version 1.1;

        # Headers
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffering
        proxy_buffering off;
    }

    # Auth endpoints with stricter rate limiting
    location /api/auth/ {
        limit_req zone=auth_limit burst=10 nodelay;

        proxy_pass http://backend;
        proxy_http_version 1.1;

        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_buffering off;
    }

    # WebSocket support (if needed)
    location /ws {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # WebSocket timeout
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    # Frontend static files
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;

        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            proxy_pass http://frontend;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Health check endpoint (no auth required)
    location /health {
        proxy_pass http://backend/api/health;
        access_log off;
    }
}
EOF

# Test configuration
echo "Testing Nginx configuration..."
sudo nginx -t

# Reload Nginx
echo "Reloading Nginx..."
sudo systemctl reload nginx

echo "Nginx configuration updated successfully!"
echo ""
echo "Backup saved to: $BACKUP_CONFIG"
ENDSSH

echo ""
echo "Nginx configuration completed!"
echo ""
echo "The new configuration proxies to:"
echo "  - Frontend: http://127.0.0.1:3000 (Docker container)"
echo "  - Backend:  http://127.0.0.1:5000 (Docker container)"
