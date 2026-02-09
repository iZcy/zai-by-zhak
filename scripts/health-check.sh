#!/bin/bash
set -e

echo "========================================="
echo "GLM Collective Health Check"
echo "========================================="

REMOTE_HOST="izcy-engine"
APP_DOMAIN="zai.izcy.tech"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_status() {
    local service=$1
    local url=$2
    local expected_code=${3:-200}

    echo -n "Checking $service... "

    if response=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 10); then
        if [ "$response" = "$expected_code" ]; then
            echo -e "${GREEN}OK${NC} (HTTP $response)"
            return 0
        else
            echo -e "${YELLOW}WARNING${NC} (HTTP $response, expected $expected_code)"
            return 1
        fi
    else
        echo -e "${RED}FAILED${NC} (connection error)"
        return 2
    fi
}

echo "Checking container status..."
ssh "$REMOTE_HOST" "cd /opt/glm-collective && docker-compose ps"

echo ""
echo "Checking HTTP endpoints..."
check_status "Frontend" "https://$APP_DOMAIN/" "200"
check_status "Backend API" "https://$APP_DOMAIN/api/health" "200"

echo ""
echo "Checking container health..."
ssh "$REMOTE_HOST" << 'ENDSSH'
set -e

echo ""
echo "Container resource usage:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

echo ""
echo "Recent backend logs:"
docker-compose logs --tail=20 backend

echo ""
echo "Recent frontend logs:"
docker-compose logs --tail=20 frontend
ENDSSH

echo ""
echo -e "${GREEN}Health check completed!${NC}"
