#!/bin/bash
set -e

echo "========================================="
echo "GLM Collective Remote Deployment Script"
echo "========================================="

REMOTE_HOST="izcy-engine"
REMOTE_DIR="/opt/glm-collective"

# Step 1: Copy files
echo "Step 1: Copying files to remote server..."
cat docker-compose.yml | ssh "$REMOTE_HOST" "cat > $REMOTE_DIR/docker-compose.yml"
cat .env.production | ssh "$REMOTE_HOST" "cat > $REMOTE_DIR/.env"
echo "Files copied successfully"

# Step 2: Stop manual processes
echo ""
echo "Step 2: Stopping manual Node.js processes..."
ssh "$REMOTE_HOST" << 'ENDSSH'
pkill -f "zai-deployment" || true
sleep 2
ENDSSH
echo "Manual processes stopped"

# Step 3: Build Docker images on remote
echo ""
echo "Step 3: Building Docker images on remote server..."
ssh "$REMOTE_HOST" << 'ENDSSH'
cd /opt/glm-collective

# Build frontend
echo "Building frontend image..."
docker build -t glm-collective-frontend:local ./frontend

# Build backend
echo "Building backend image..."
docker build -t glm-collective-backend:local ./backend

echo "Docker images built successfully"
ENDSSH

# Step 4: Backup MongoDB
echo ""
echo "Step 4: Backing up MongoDB..."
ssh "$REMOTE_HOST" << 'ENDSSH'
mkdir -p /opt/glm-collective/backups

# Get MongoDB password from .env
source /opt/glm-collective/.env

# Backup MongoDB
docker exec fullstack-mongodb mongodump \
    --username="$MONGODB_ROOT_USERNAME" \
    --password="$MONGODB_ROOT_PASSWORD" \
    --authenticationDatabase=admin \
    --db="$MONGODB_DATABASE" \
    --archive="/opt/glm-collective/backups/mongodb-backup-$(date +%Y%m%d-%H%M%S).gz" \
    --gzip

echo "MongoDB backup completed"
ENDSSH

# Step 5: Stop old MongoDB container
echo ""
echo "Step 5: Stopping old MongoDB container..."
ssh "$REMOTE_HOST" << 'ENDSSH'
if docker ps -a | grep -q "fullstack-mongodb"; then
    docker stop fullstack-mongodb
    docker rename fullstack-mongodb fullstack-mongodb-old
    echo "Old MongoDB container stopped and renamed"
fi
ENDSSH

# Step 6: Start Docker Compose services
echo ""
echo "Step 6: Starting Docker Compose services..."
ssh "$REMOTE_HOST" << 'ENDSSH'
cd /opt/glm-collective
docker compose down 2>/dev/null || true
docker compose up -d frontend backend mongodb
echo "Waiting for services to start..."
sleep 10
docker compose ps
ENDSSH

# Step 7: Verify services
echo ""
echo "Step 7: Verifying services..."
ssh "$REMOTE_HOST" << 'ENDSSH'
cd /opt/glm-collective

echo "Frontend logs:"
docker compose logs frontend | tail -5

echo ""
echo "Backend logs:"
docker compose logs backend | tail -5

echo ""
echo "MongoDB logs:"
docker compose logs mongodb | tail -5
ENDSSH

echo ""
echo "========================================="
echo "Deployment completed successfully!"
echo "========================================="
echo ""
echo "To view logs:"
echo "  ssh $REMOTE_HOST 'cd $REMOTE_DIR && docker compose logs -f'"
echo ""
echo "To check service status:"
echo "  ssh $REMOTE_HOST 'cd $REMOTE_DIR && docker compose ps'"
