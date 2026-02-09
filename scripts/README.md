# Deployment Scripts

This directory contains scripts for deploying and managing the GLM Collective application.

## Scripts Overview

| Script | Purpose | Usage |
|--------|---------|-------|
| `deploy-production.sh` | Deploy all services to production | `./scripts/deploy-production.sh` |
| `rollback.sh` | Rollback to legacy setup | `./scripts/rollback.sh` |
| `health-check.sh` | Check service health | `./scripts/health-check.sh` |
| `update-nginx.sh` | Update Nginx configuration | `./scripts/update-nginx.sh` |
| `backup.sh` | Create MongoDB backups | `./scripts/backup.sh` |

## Deploy to Production

### Quick Start

```bash
# Full deployment (build images, backup data, deploy)
./scripts/deploy-production.sh

# Deploy without building images
./scripts/deploy-production.sh --skip-build

# Deploy without database migration
./scripts/deploy-production.sh --skip-migration
```

### What It Does

1. **Builds Docker images** (unless `--skip-build`)
2. **Backs up MongoDB data** (if running locally)
3. **Copies files to remote server**
4. **Loads images and starts services** on remote

### Configuration

Edit `.env.production` to configure:
- MongoDB credentials
- Service ports
- Domain names
- Backup settings

## Health Check

```bash
./scripts/health-check.sh
```

Checks:
- Container status
- HTTP endpoints
- Resource usage
- Recent logs

## Rollback

```bash
./scripts/rollback.sh
```

Stops Docker Compose services and restarts legacy Node.js processes.

## Update Nginx

```bash
./scripts/update-nginx.sh
```

Updates Nginx configuration to proxy to Docker containers on localhost.

## Manual Deployment

If you need more control:

```bash
# 1. Build images
docker build -t glm-collective-frontend:local ./frontend
docker build -t glm-collective-backend:local ./backend

# 2. Copy to server
scp docker-compose.yml .env.production izcy-engine:/opt/glm-collective/

# 3. Deploy
ssh izcy-engine
cd /opt/glm-collective
docker compose up -d
```

## Troubleshooting

### Script Permission Denied

```bash
chmod +x scripts/*.sh
```

### SSH Connection Issues

Ensure SSH key is configured:

```bash
ssh-copy-id izcy-engine
```

### Docker Build Fails

Check Docker daemon is running:

```bash
sudo systemctl status docker
```

## CI/CD Integration

The GitHub Actions workflow (`.github/workflows/ci-cd.yml`) automatically:

1. Builds and tests on every push
2. Builds Docker images and pushes to GHCR
3. Deploys to production (requires manual approval)

Required secrets:
- `SSH_PRIVATE_KEY`
- `PROD_VM_HOST`
- `PROD_VM_USER`
- `MONGODB_ROOT_PASSWORD`
- `SLACK_WEBHOOK` (optional)
