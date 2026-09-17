#!/bin/bash

# PostgreSQL Database Restore Script
# Usage: ./restore-database.sh [OPTIONS]
#
# Options:
#   -f, --file FILE       Backup file to restore (required)
#   -d, --database URL    Database connection URL (default: from env)
#   -c, --create          Create database if not exists
#   -v, --verbose         Verbose output
#   -y, --yes             Skip confirmation prompt
#   -h, --help            Show this help message

set -euo pipefail

# Default values
DATABASE_URL="${DATABASE_URL:-}"
CREATE_DB=false
VERBOSE=false
SKIP_CONFIRM=false
BACKUP_FILE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -f|--file)
      BACKUP_FILE="$2"
      shift 2
      ;;
    -d|--database)
      DATABASE_URL="$2"
      shift 2
      ;;
    -c|--create)
      CREATE_DB=true
      shift
      ;;
    -v|--verbose)
      VERBOSE=true
      shift
      ;;
    -y|--yes)
      SKIP_CONFIRM=true
      shift
      ;;
    -h|--help)
      head -14 "$0" | tail -13
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Validate required arguments
if [ -z "$BACKUP_FILE" ]; then
  echo "Error: Backup file not specified"
  echo "Usage: $0 -f backup_20240101_120000.sql"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL not set"
  echo "Usage: $0 -f backup.sql -d postgresql://user:pass@host:5432/dbname"
  exit 1
fi

# Handle compressed files
RESTORE_FILE="$BACKUP_FILE"
if [[ "$BACKUP_FILE" == *.gz ]]; then
  if [ "$VERBOSE" = true ]; then
    echo "Decompressing backup file..."
  fi
  RESTORE_FILE="${BACKUP_FILE%.gz}"
  gunzip -k -f "$BACKUP_FILE"
fi

# Confirmation prompt
if [ "$SKIP_CONFIRM" = false ]; then
  echo "WARNING: This will restore the database from backup."
  echo "Backup file: $BACKUP_FILE"
  echo "Target database: ${DATABASE_URL%%@*}@***"
  echo ""
  read -p "Are you sure? (yes/no): " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
  fi
fi

# Create database if requested
if [ "$CREATE_DB" = true ]; then
  if [ "$VERBOSE" = true ]; then
    echo "Creating database..."
  fi
  # Extract database name from URL
  DB_NAME=$(echo "$DATABASE_URL" | sed 's|.*/||')
  psql "$DATABASE_URL" -c "CREATE DATABASE $DB_NAME" 2>/dev/null || true
fi

# Restore database
if [ "$VERBOSE" = true ]; then
  echo "Starting database restore..."
fi

psql "$DATABASE_URL" -f "$RESTORE_FILE" --quiet

# Clean up decompressed file if applicable
if [[ "$BACKUP_FILE" == *.gz ]] && [ -f "$RESTORE_FILE" ]; then
  rm -f "$RESTORE_FILE"
fi

if [ "$VERBOSE" = true ]; then
  echo "Database restore completed successfully!"
fi
