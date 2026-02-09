# Docker Compose Deployment Guide

This guide covers deploying the GLM Collective application using Docker Compose.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Initial Deployment](#initial-deployment)
4. [Production Deployment](#production-deployment)
5. [Service Management](#service-management)
6. [Troubleshooting](#troubleshooting)
7. [Rollback Procedures](#rollback-procedures)

## Overview

The application consists of three main services:

- **Frontend**: Vite-based React application (port 3000)
- **Backend**: Node.js/Express API (port 5000)
- **MongoDB**: Database (port 27017)

All services are orchestrated via Docker Compose with proper networking and health checks.

## Prerequisites

### Local Machine

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
sudo apt-get install docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### Remote Server

```bash
# Ensure Docker and Docker Compose are installed
docker --version
docker compose version

# Create deployment directory
sudo mkdir -p /opt/glm-collective/backups
sudo chown $USER:$USER /opt/glm-collective
```

## Initial Deployment

### Step 1: Prepare Environment File

Copy and customize the production environment file:

```bash
cp .env.production .env.local
# Edit .env.local with your configuration
```

**Critical settings:**

```bash
# For local builds
CONTAINER_REGISTRY=
IMAGE_TAG=local

# MongoDB credentials
MONGODB_ROOT_PASSWORD=<your-secure-password>

# Domain configuration
APP_DOMAIN=zai.izcy.tech
FRONTEND_URL=https://zai.izcy.tech
API_URL=https://zai.izcy.tech/api
```

### Step 2: Build Docker Images

```bash
# Build frontend
docker build -t glm-collective-frontend:local ./frontend

# Build backend
docker build -t glm-collective-backend:local ./backend

# Verify images
docker images | grep glm-collective
```

### Step 3: Test Locally (Optional)

```bash
# Start services locally
docker compose --env-file .env.local up -d

# Check logs
docker compose logs -f backend
docker compose logs -f frontend

# Test endpoints
curl http://localhost:3000/
curl http://localhost:5000/api/health

# Stop services
docker compose down
```

## Production Deployment

### Automated Deployment

Use the deployment script for production:

```bash
./scripts/deploy-production.sh
```

**Options:**

- `--skip-build` - Skip Docker image building
- `--skip-migration` - Skip MongoDB backup
- `--skip-deploy` - Skip remote deployment (just build)

Example:

```bash
# Build and deploy everything
./scripts/deploy-production.sh

# Deploy only (skip building)
./scripts/deploy-production.sh --skip-build
```

### Manual Deployment

#### Step 1: Update Nginx Configuration

Run the Nginx update script:

```bash
./scripts/update-nginx.sh
```

This updates the upstream configuration to proxy to localhost ports exposed by Docker containers.

#### Step 2: Deploy to Remote Server

```bash
# Copy files to server
scp docker-compose.yml .env.production izcy-engine:/opt/glm-collective/

# SSH to server
ssh izcy-engine

# On server:
cd /opt/glm-collective
docker compose down  # Stop any existing services
docker compose up -d frontend backend mongodb
```

#### Step 3: Verify Deployment

```bash
# Run health check
./scripts/health-check.sh

# Or manually:
ssh izcy-engine "cd /opt/glm-collective && docker compose ps"
curl https://zai.izcy.tech/
curl https://zai.izcy.tech/api/health
```

## Service Management

### View Service Status

```bash
# All services
docker compose ps

# Service logs
docker compose logs -f
docker compose logs -f backend
docker compose logs -f frontend

# Real-time resource usage
docker stats
```

### Restart Services

```bash
# Restart all services
docker compose restart

# Restart specific service
docker compose restart backend
docker compose restart frontend

# Full restart (stop and start)
docker compose down
docker compose up -d
```

### Update Services

```bash
# Build new images
docker build -t glm-collective-frontend:local ./frontend
docker build -t glm-collective-backend:local ./backend

# On remote server, pull and restart
ssh izcy-engine
cd /opt/glm-collective
docker compose up -d --force-recreate
```

### Scale Services

```bash
# Scale backend (requires load balancer)
docker compose up -d --scale backend=3
```

## Troubleshooting

### Container Fails to Start

**Check logs:**

```bash
docker compose logs backend
docker compose logs frontend
```

**Common issues:**

1. **Port conflicts** - Ensure ports 3000, 5000, 27017 are available

2. **Environment variables** - Verify `.env.production` has correct values

3. **MongoDB connection** - Check MongoDB credentials and network

### Services Not Responding

**Check container health:**

```bash
docker compose ps
docker inspect <container-id> | grep -A 10 Health
```

**Test from inside container:**

```bash
docker exec -it glm-collective-backend-1 sh
curl http://localhost:5000/api/health
exit
```

### Database Issues

**Backup MongoDB:**

```bash
docker exec fullstack-mongodb mongodump \
  --username=admin \
  --password=<password> \
  --authenticationDatabase=admin \
  --db=fullstack \
  --archive=/tmp/backup.gz \
  --gzip

docker cp fullstack-mongodb:/tmp/backup.gz ./backups/
```

**Restore MongoDB:**

```bash
docker cp ./backups/backup.gz fullstack-mongodb:/tmp/restore.gz
docker exec fullstack-mongodb mongorestore \
  --username=admin \
  --password=<password> \
  --authenticationDatabase=admin \
  --db=fullstack \
  --archive=/tmp/restore.gz \
  --gzip
```

### Network Issues

**Check Docker network:**

```bash
docker network ls
docker network inspect glm-collective_default
```

**Test connectivity:**

```bash
docker exec glm-collective-backend-1 ping fullstack-mongodb
docker exec glm-collective-frontend-1 curl http://glm-collective-backend:5000/api/health
```

### High CPU/Memory Usage

**Check resource usage:**

```bash
docker stats
```

**Limit resources in docker-compose.yml:**

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
```

## Rollback Procedures

### Quick Rollback

Use the rollback script:

```bash
./scripts/rollback.sh
```

### Manual Rollback

**Stop Docker Compose:**

```bash
ssh izcy-engine
cd /opt/glm-collective
docker compose down
```

**Start legacy services:**

```bash
cd ~/zai-deployment/backend
nohup node src/index.js > /tmp/backend.log 2>&1 &

cd ~/zai-deployment/frontend
nohup npm run dev > /tmp/frontend.log 2>&1 &

docker start fullstack-mongodb-old
```

**Restore Nginx config:**

```bash
sudo cp /etc/nginx/sites-available/zai.izcy.tech.backup-* /etc/nginx/sites-available/zai.izcy.tech
sudo nginx -t
sudo systemctl reload nginx
```

## CI/CD Integration

The GitHub Actions workflow (`.github/workflows/ci-cd.yml`) includes:

1. **Build & Test** - On every push
2. **Build Docker Images** - Push to GHCR
3. **Deploy to Production** - Manual approval required

**Required GitHub Secrets:**

- `SSH_PRIVATE_KEY` - SSH key for server access
- `PROD_VM_HOST` - Server hostname (e.g., `izcy-engine`)
- `PROD_VM_USER` - SSH username
- `MONGODB_ROOT_PASSWORD` - Database password
- `SLACK_WEBHOOK` - For deployment notifications

## Monitoring

### Health Checks

```bash
# Run health check script
./scripts/health-check.sh
```

### Log Monitoring

```bash
# Follow all logs
docker compose logs -f

# Filter by service
docker compose logs -f backend | grep ERROR

# Export logs
docker compose logs > deployment-$(date +%Y%m%d).log
```

### Resource Monitoring

```bash
# Real-time stats
watch -n 1 'docker stats --no-stream'

# Disk usage
du -sh /var/lib/docker
df -h
```

## Backup Strategy

### Automated Backups

MongoDB backups are created daily (configurable in `.env.production`):

```bash
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *  # Daily at 2 AM
BACKUP_RETENTION_DAYS=7
```

### Manual Backup

```bash
# MongoDB backup
docker exec fullstack-mongodb mongodump \
  --username=admin \
  --password=$MONGODB_ROOT_PASSWORD \
  --authenticationDatabase=admin \
  --db=fullstack \
  --archive=/opt/glm-collective/backups/mongodb-$(date +%Y%m%d).gz \
  --gzip
```

### Backup Restoration

```bash
# Stop services
docker compose down

# Restore backup
docker run --rm -v fullstack_dbdata:/data \
  -v /opt/glm-collective/backups:/backup \
  mongo:7.0 mongorestore \
  --username=admin \
  --password=$MONGODB_ROOT_PASSWORD \
  --authenticationDatabase=admin \
  --db=fullstack \
  --archive=/backup/mongodb-backup.gz \
  --gzip

# Start services
docker compose up -d
```

## Security Considerations

1. **Never commit `.env.production`** to version control
2. **Rotate MongoDB passwords** regularly
3. **Keep Docker images updated** with security patches
4. **Use Docker secrets** for sensitive data in production
5. **Enable firewall rules** to restrict access to MongoDB
6. **Monitor container logs** for suspicious activity

## Support

For issues or questions:

1. Check logs: `docker compose logs -f <service>`
2. Run health check: `./scripts/health-check.sh`
3. Review troubleshooting section above
4. Check GitHub issues for known problems
