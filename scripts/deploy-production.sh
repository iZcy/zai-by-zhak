#!/bin/bash
set -e

echo "========================================="
echo "GLM Collective Production Deployment"
echo "========================================="

# Configuration
REMOTE_HOST="izcy-engine"
REMOTE_DIR="/opt/glm-collective"
LOCAL_BACKUP_DIR="./backups"

# Parse arguments
SKIP_BUILD=false
SKIP_MIGRATION=false
SKIP_DEPLOY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-migration)
            SKIP_MIGRATION=true
            shift
            ;;
        --skip-deploy)
            SKIP_DEPLOY=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Step 1: Build Docker images
if [ "$SKIP_BUILD" = false ]; then
    echo ""
    echo "Step 1: Building Docker images..."
    docker build -t glm-collective-frontend:local ./frontend
    docker build -t glm-collective-backend:local ./backend
    echo "Docker images built successfully"
else
    echo "Skipping Docker image build"
fi

# Step 2: Save images to tar files
echo ""
echo "Step 2: Exporting Docker images..."
mkdir -p "$LOCAL_BACKUP_DIR"
docker save glm-collective-frontend:local -o "$LOCAL_BACKUP_DIR/frontend.tar"
docker save glm-collective-backend:local -o "$LOCAL_BACKUP_DIR/backend.tar"
echo "Docker images exported"

# Step 3: MongoDB backup (if running locally)
if [ "$SKIP_MIGRATION" = false ]; then
    echo ""
    echo "Step 3: Checking for local MongoDB backup..."

    # Check if MongoDB is running locally
    if docker ps | grep -q "fullstack-mongodb"; then
        echo "Backing up MongoDB data..."
        mkdir -p "$LOCAL_BACKUP_DIR/mongodb"

        # Get MongoDB password from .env.production
        if [ -f .env.production ]; then
            source .env.production
            docker exec fullstack-mongodb mongodump \
                --username="$MONGODB_ROOT_USERNAME" \
                --password="$MONGODB_ROOT_PASSWORD" \
                --authenticationDatabase=admin \
                --db="$MONGODB_DATABASE" \
                --archive="$LOCAL_BACKUP_DIR/mongodb/backup.gz" \
                --gzip
            echo "MongoDB backup completed"
        else
            echo "Warning: .env.production not found, skipping MongoDB backup"
        fi
    else
        echo "No local MongoDB found, skipping backup"
    fi
else
    echo "Skipping MongoDB migration"
fi

# Step 4: Copy files to remote server
if [ "$SKIP_DEPLOY" = false ]; then
    echo ""
    echo "Step 4: Deploying to remote server..."

    # Create remote directory if it doesn't exist
    ssh "$REMOTE_HOST" "mkdir -p $REMOTE_DIR/backups"

    # Copy docker-compose.yml and environment file
    scp docker-compose.yml "$REMOTE_HOST:$REMOTE_DIR/"
    scp .env.production "$REMOTE_HOST:$REMOTE_DIR/.env"

    # Copy Docker images
    scp "$LOCAL_BACKUP_DIR/frontend.tar" "$REMOTE_HOST:$REMOTE_DIR/backups/"
    scp "$LOCAL_BACKUP_DIR/backend.tar" "$REMOTE_HOST:$REMOTE_DIR/backups/"

    # Copy MongoDB backup if exists
    if [ -f "$LOCAL_BACKUP_DIR/mongodb/backup.gz" ]; then
        scp "$LOCAL_BACKUP_DIR/mongodb/backup.gz" "$REMOTE_HOST:$REMOTE_DIR/backups/"
    fi

    echo "Files copied to remote server"
else
    echo "Skipping deployment"
fi

# Step 5: Load images and start services on remote
if [ "$SKIP_DEPLOY" = false ]; then
    echo ""
    echo "Step 5: Starting services on remote server..."

    ssh "$REMOTE_HOST" << 'ENDSSH'
set -e
cd /opt/glm-collective

echo "Loading Docker images..."
docker load -i backups/frontend.tar
docker load -i backups/backend.tar

echo "Stopping existing services..."
docker-compose down 2>/dev/null || true

echo "Starting services with Docker Compose..."
docker-compose up -d frontend backend mongodb

echo "Waiting for services to be healthy..."
sleep 10

echo "Checking service status..."
docker-compose ps

echo "Services started successfully!"
ENDSSH

    echo ""
    echo "Deployment completed successfully!"
    echo ""
    echo "To view logs:"
    echo "  ssh $REMOTE_HOST 'cd $REMOTE_DIR && docker-compose logs -f'"
    echo ""
    echo "To check service status:"
    echo "  ssh $REMOTE_HOST 'cd $REMOTE_DIR && docker-compose ps'"
fi
