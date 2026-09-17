#!/bin/bash

# PostgreSQL Database Backup Script
# Usage: ./backup-database.sh [OPTIONS]
#
# Options:
#   -d, --database URL    Database connection URL (default: from env)
#   -o, --output DIR      Output directory (default: ./backups/database)
#   -r, --retain DAYS     Retention period in days (default: 30)
#   -c, --compress        Enable gzip compression
#   -v, --verbose         Verbose output
#   -h, --help            Show this help message

set -euo pipefail

# Default values
BACKUP_DIR="./backups/database"
RETENTION_DAYS=30
COMPRESS=false
VERBOSE=false
DATABASE_URL="${DATABASE_URL:-}"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -d|--database)
      DATABASE_URL="$2"
      shift 2
      ;;
    -o|--output)
      BACKUP_DIR="$2"
      shift 2
      ;;
    -r|--retain)
      RETENTION_DAYS="$2"
      shift 2
      ;;
    -c|--compress)
      COMPRESS=true
      shift
      ;;
    -v|--verbose)
      VERBOSE=true
      shift
      ;;
    -h|--help)
      head -13 "$0" | tail -12
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Validate DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL not set"
  echo "Usage: $0 -d postgresql://user:pass@host:5432/dbname"
  exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup_${TIMESTAMP}.sql"

# Run pg_dump
if [ "$VERBOSE" = true ]; then
  echo "Starting database backup..."
  echo "Database: ${DATABASE_URL%%@*}@***"
  echo "Output: $BACKUP_FILE"
fi

pg_dump "$DATABASE_URL" \
  --format=plain \
  --no-owner \
  --no-privileges \
  --verbose \
  > "$BACKUP_FILE" 2>/dev/null

# Compress if requested
if [ "$COMPRESS" = true ]; then
  gzip "$BACKUP_FILE"
  BACKUP_FILE="${BACKUP_FILE}.gz"
  if [ "$VERBOSE" = true ]; then
    echo "Compressed: $BACKUP_FILE"
  fi
fi

# Get file size
FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

if [ "$VERBOSE" = true ]; then
  echo "Backup completed: $BACKUP_FILE ($FILE_SIZE)"
fi

# Clean old backups
if [ "$VERBOSE" = true ]; then
  echo "Cleaning backups older than $RETENTION_DAYS days..."
fi

find "$BACKUP_DIR" -name "backup_*" -type f -mtime +"$RETENTION_DAYS" -delete

# Count remaining backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "backup_*" -type f | wc -l)

if [ "$VERBOSE" = true ]; then
  echo "Retained backups: $BACKUP_COUNT"
  echo "Backup process completed successfully!"
fi

# Output for cron/automation
echo "$BACKUP_FILE"
