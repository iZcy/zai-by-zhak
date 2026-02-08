#!/bin/bash
# Provider-Agnostic MongoDB Backup Script
# Can be used standalone or as part of Docker Compose / Ansible deployment

set -e

# ============================================
# Configuration
# ============================================
MONGODB_HOST="${MONGODB_HOST:-localhost}"
MONGODB_PORT="${MONGODB_PORT:-27017}"
MONGODB_USERNAME="${MONGODB_ROOT_USERNAME:-admin}"
MONGODB_PASSWORD="${MONGODB_ROOT_PASSWORD:-password}"
MONGODB_DATABASE="${MONGODB_DATABASE:-fullstack}"

BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_NAME="mongodb-backup-${TIMESTAMP}.gz"

# ============================================
# Functions
# ============================================

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    log "ERROR: $1"
    exit 1
}

# ============================================
# Pre-flight checks
# ============================================

log "Starting MongoDB backup..."

# Create backup directory if it doesn't exist
if [ ! -d "$BACKUP_DIR" ]; then
    log "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
fi

# Check if mongodump is available
if ! command -v mongodump &> /dev/null; then
    # Check if we're inside a container and need to use docker exec
    if [ -n "$MONGODB_CONTAINER" ]; then
        log "Using MongoDB container: $MONGODB_CONTAINER"
    else
        error "mongodump not found. Please install MongoDB tools or set MONGODB_CONTAINER"
    fi
fi

# ============================================
# Backup Process
# ============================================

BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

if [ -n "$MONGODB_CONTAINER" ]; then
    # Backup from Docker container
    log "Creating backup in container..."
    docker exec "$MONGODB_CONTAINER" mongodump \
        --host="$MONGODB_HOST" \
        --port="$MONGODB_PORT" \
        --username="$MONGODB_USERNAME" \
        --password="$MONGODB_PASSWORD" \
        --authenticationDatabase=admin \
        --db="$MONGODB_DATABASE" \
        --archive="/tmp/${BACKUP_NAME}" \
        --gzip

    log "Copying backup from container..."
    docker cp "$MONGODB_CONTAINER:/tmp/${BACKUP_NAME}" "$BACKUP_PATH"

    log "Cleaning up container..."
    docker exec "$MONGODB_CONTAINER" rm -f "/tmp/${BACKUP_NAME}"
else
    # Local backup
    log "Creating local backup..."
    mongodump \
        --host="$MONGODB_HOST" \
        --port="$MONGODB_PORT" \
        --username="$MONGODB_USERNAME" \
        --password="$MONGODB_PASSWORD" \
        --authenticationDatabase=admin \
        --db="$MONGODB_DATABASE" \
        --archive="$BACKUP_PATH" \
        --gzip
fi

# Get backup file size
BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
log "Backup created: $BACKUP_PATH ($BACKUP_SIZE)"

# ============================================
# Cleanup old backups
# ============================================

if [ "$BACKUP_RETENTION_DAYS" -gt 0 ]; then
    log "Cleaning up backups older than $BACKUP_RETENTION_DAYS days..."
    DELETED=$(find "$BACKUP_DIR" -name "mongodb-backup-*.gz" -type f -mtime +$BACKUP_RETENTION_DAYS -delete -print | wc -l)
    log "Deleted $DELETED old backup(s)"
fi

# ============================================
# Summary
# ============================================

TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
TOTAL_BACKUPS=$(find "$BACKUP_DIR" -name "mongodb-backup-*.gz" -type f | wc -l)

log "Backup completed successfully!"
log "Total backups: $TOTAL_BACKUPS"
log "Total size: $TOTAL_SIZE"
log "Retention: $BACKUP_RETENTION_DAYS days"

# Optional: Send to remote backup
if [ -n "$REMOTE_BACKUP_HOST" ] && [ -n "$REMOTE_BACKUP_PATH" ]; then
    log "Copying backup to remote server..."
    scp "$BACKUP_PATH" "${REMOTE_BACKUP_USER:-backup}@${REMOTE_BACKUP_HOST}:${REMOTE_BACKUP_PATH}/"
    log "Remote backup completed"
fi

exit 0
