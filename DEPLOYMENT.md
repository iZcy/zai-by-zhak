# Quick Start: Docker Compose Deployment

This guide provides the essential steps to deploy the GLM Collective application using Docker Compose.

## Prerequisites

- Docker and Docker Compose installed
- SSH access to the production server (izcy-engine)
- Domain configured: zai.izcy.tech

## Deployment Steps

### 1. Initial Setup (Run Once)

```bash
# 1. Create production environment file
cp .env.production .env.local

# 2. Edit .env.local and set a secure MongoDB password
# MONGODB_ROOT_PASSWORD=<your-secure-password>

# 3. Build Docker images locally
docker build -t glm-collective-frontend:local ./frontend
docker build -t glm-collective-backend:local ./backend

# 4. Update Nginx configuration on remote server
./scripts/update-nginx.sh
```

### 2. Deploy to Production

```bash
# Automated deployment
./scripts/deploy-production.sh

# Manual deployment (alternative)
scp docker-compose.yml .env.production izcy-engine:/opt/glm-collective/
ssh izcy-engine "cd /opt/glm-collective && docker compose up -d"
```

### 3. Verify Deployment

```bash
# Run health check
./scripts/health-check.sh

# Manual verification
curl https://zai.izcy.tech/
curl https://zai.izcy.tech/api/health
```

## Management Commands

### View Service Status

```bash
ssh izcy-engine "cd /opt/glm-collective && docker compose ps"
```

### View Logs

```bash
# All services
ssh izcy-engine "cd /opt/glm-collective && docker compose logs -f"

# Specific service
ssh izcy-engine "cd /opt/glm-collective && docker compose logs -f backend"
```

### Restart Services

```bash
# Restart all
ssh izcy-engine "cd /opt/glm-collective && docker compose restart"

# Restart specific service
ssh izcy-engine "cd /opt/glm-collective && docker compose restart backend"
```

### Update Services

```bash
# 1. Build new images
docker build -t glm-collective-frontend:local ./frontend
docker build -t glm-collective-backend:local ./backend

# 2. Deploy
./scripts/deploy-production.sh --skip-build
```

## Troubleshooting

### If Deployment Fails

```bash
# Check container logs
ssh izcy-engine "cd /opt/glm-collective && docker compose logs"

# Verify containers are running
ssh izcy-engine "docker ps"
```

### Rollback to Previous Setup

```bash
# Quick rollback
./scripts/rollback.sh

# Manual rollback
ssh izcy-engine "cd /opt/glm-collective && docker compose down"
ssh izcy-engine "cd ~/zai-deployment/backend && nohup node src/index.js > /tmp/backend.log 2>&1 &"
ssh izcy-engine "cd ~/zai-deployment/frontend && nohup npm run dev > /tmp/frontend.log 2>&1 &"
```

## Architecture

```
                     ┌─────────────────┐
                     │   Nginx (Host)  │
                     │   :443, :80     │
                     └────────┬────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
         ┌─────────────┐             ┌─────────────┐
         │  Frontend   │             │   Backend   │
         │  Docker     │◄────────────┤   Docker    │
         │  :3000      │             │   :5000     │
         └─────────────┘             └──────┬──────┘
                                             │
                                             ▼
                                      ┌─────────────┐
                                      │   MongoDB   │
                                      │   Docker    │
                                      │   :27017    │
                                      └─────────────┘
```

## Key Files

- `.env.production` - Production environment configuration
- `docker-compose.yml` - Service orchestration
- `scripts/deploy-production.sh` - Automated deployment script
- `scripts/rollback.sh` - Rollback to legacy setup
- `scripts/health-check.sh` - Health verification
- `scripts/update-nginx.sh` - Nginx configuration update

## Next Steps

For detailed documentation, see [docs/DOCKER_COMPOSE_DEPLOYMENT.md](docs/DOCKER_COMPOSE_DEPLOYMENT.md)
