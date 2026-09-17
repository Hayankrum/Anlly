#!/bin/bash

# S3 Storage Backup Script
# Usage: ./backup-storage.sh [OPTIONS]
#
# Options:
#   -b, --bucket NAME     S3 bucket name (default: from env)
#   -e, --endpoint URL    S3 endpoint (default: from env)
#   -o, --output DIR      Output directory (default: ./backups/storage)
#   -r, --retain DAYS     Retention period in days (default: 30)
#   -v, --verbose         Verbose output
#   -h, --help            Show this help message
#
# Environment variables:
#   STORAGE_BUCKET        S3 bucket name
#   STORAGE_ENDPOINT      S3 endpoint URL
#   STORAGE_ACCESS_KEY    AWS access key
#   STORAGE_SECRET_KEY    AWS secret key
#   STORAGE_REGION        AWS region

set -euo pipefail

# Default values
BACKUP_DIR="./backups/storage"
RETENTION_DAYS=30
VERBOSE=false
BUCKET="${STORAGE_BUCKET:-}"
ENDPOINT="${STORAGE_ENDPOINT:-}"
REGION="${STORAGE_REGION:-sa-east-1}"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -b|--bucket)
      BUCKET="$2"
      shift 2
      ;;
    -e|--endpoint)
      ENDPOINT="$2"
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
    -v|--verbose)
      VERBOSE=true
      shift
      ;;
    -h|--help)
      head -19 "$0" | tail -18
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Validate required variables
if [ -z "$BUCKET" ]; then
  echo "Error: STORAGE_BUCKET not set"
  echo "Usage: $0 -b my-bucket"
  exit 1
fi

if [ -z "${STORAGE_ACCESS_KEY:-}" ] || [ -z "${STORAGE_SECRET_KEY:-}" ]; then
  echo "Error: STORAGE_ACCESS_KEY and STORAGE_SECRET_KEY must be set"
  exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_SUBDIR="$BACKUP_DIR/storage_${TIMESTAMP}"
mkdir -p "$BACKUP_SUBDIR"

# Build AWS CLI options
AWS_OPTS=""
if [ -n "$ENDPOINT" ]; then
  AWS_OPTS="--endpoint-url $ENDPOINT"
fi

# Sync bucket to local
if [ "$VERBOSE" = true ]; then
  echo "Starting storage backup..."
  echo "Bucket: $BUCKET"
  echo "Endpoint: ${ENDPOINT:-default}"
  echo "Output: $BACKUP_SUBDIR"
fi

aws s3 sync "s3://$BUCKET" "$BACKUP_SUBDIR" \
  --region "$REGION" \
  $AWS_OPTS \
  --quiet

# Create metadata file
cat > "$BACKUP_SUBDIR/backup-metadata.json" << EOF
{
  "timestamp": "$TIMESTAMP",
  "bucket": "$BUCKET",
  "endpoint": "$ENDPOINT",
  "region": "$REGION",
  "files_count": $(find "$BACKUP_SUBDIR" -type f -not -name "backup-metadata.json" | wc -l)
}
EOF

# Get total size
TOTAL_SIZE=$(du -sh "$BACKUP_SUBDIR" | cut -f1)

if [ "$VERBOSE" = true ]; then
  echo "Backup completed: $BACKUP_SUBDIR ($TOTAL_SIZE)"
fi

# Clean old backups
if [ "$VERBOSE" = true ]; then
  echo "Cleaning backups older than $RETENTION_DAYS days..."
fi

find "$BACKUP_DIR" -name "storage_*" -type d -mtime +"$RETENTION_DAYS" -exec rm -rf {} + 2>/dev/null || true

# Count remaining backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "storage_*" -type d | wc -l)

if [ "$VERBOSE" = true ]; then
  echo "Retained backups: $BACKUP_COUNT"
  echo "Storage backup process completed successfully!"
fi

# Output for cron/automation
echo "$BACKUP_SUBDIR"
