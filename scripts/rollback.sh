#!/bin/bash
set -e

echo "========================================="
echo "GLM Collective Rollback Script"
echo "========================================="

REMOTE_HOST="izcy-engine"
REMOTE_DIR="/opt/glm-collective"

echo "Stopping Docker Compose services..."
ssh "$REMOTE_HOST" "cd $REMOTE_DIR && docker-compose down"

echo "Restoring old services..."
ssh "$REMOTE_HOST" << 'ENDSSH'
set -e
cd ~/zai-deployment

# Start backend
echo "Starting backend..."
cd backend
nohup node src/index.js > /tmp/backend.log 2>&1 &

# Start frontend
echo "Starting frontend..."
cd ~/zai-deployment/frontend
nohup npm run dev > /tmp/frontend.log 2>&1 &

# Start old MongoDB if it exists
if docker ps -a | grep -q "fullstack-mongodb-old"; then
    echo "Starting old MongoDB container..."
    docker start fullstack-mongodb-old
elif docker ps -a | grep -q "fullstack-mongodb"; then
    echo "Starting MongoDB container..."
    docker start fullstack-mongodb
fi
ENDSSH

echo "Rollback completed!"
echo ""
echo "To check if services are running:"
echo "  ssh $REMOTE_HOST 'ps aux | grep -E \"(node|vite)\"'"
echo ""
echo "To view logs:"
echo "  ssh $REMOTE_HOST 'tail -f /tmp/backend.log'"
echo "  ssh $REMOTE_HOST 'tail -f /tmp/frontend.log'"
