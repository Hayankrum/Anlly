#!/bin/bash

# List Backups Script
# Usage: ./list-backups.sh [OPTIONS]
#
# Options:
#   -d, --dir DIR         Backup directory (default: ./backups)
#   -t, --type TYPE       Filter by type: database, storage, all (default: all)
#   -v, --verbose         Verbose output
#   -h, --help            Show this help message

set -euo pipefail

# Default values
BACKUP_DIR="./backups"
BACKUP_TYPE="all"
VERBOSE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -d|--dir)
      BACKUP_DIR="$2"
      shift 2
      ;;
    -t|--type)
      BACKUP_TYPE="$2"
      shift 2
      ;;
    -v|--verbose)
      VERBOSE=true
      shift
      ;;
    -h|--help)
      head -12 "$0" | tail -11
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
  echo "No backups found in $BACKUP_DIR"
  exit 0
fi

echo "=== Backups in $BACKUP_DIR ==="
echo ""

# List database backups
if [ "$BACKUP_TYPE" = "all" ] || [ "$BACKUP_TYPE" = "database" ]; then
  echo "--- Database Backups ---"
  DB_DIR="$BACKUP_DIR/database"
  if [ -d "$DB_DIR" ]; then
    find "$DB_DIR" -name "backup_*" -type f | sort -r | while read -r file; do
      size=$(du -h "$file" | cut -f1)
      date=$(stat -c "%y" "$file" 2>/dev/null || stat -f "%Sm" "$file" 2>/dev/null)
      echo "  $(basename "$file") ($size) - $date"
    done
  else
    echo "  No database backups found"
  fi
  echo ""
fi

# List storage backups
if [ "$BACKUP_TYPE" = "all" ] || [ "$BACKUP_TYPE" = "storage" ]; then
  echo "--- Storage Backups ---"
  STORAGE_DIR="$BACKUP_DIR/storage"
  if [ -d "$STORAGE_DIR" ]; then
    find "$STORAGE_DIR" -name "storage_*" -type d | sort -r | while read -r dir; do
      size=$(du -sh "$dir" | cut -f1)
      date=$(stat -c "%y" "$dir" 2>/dev/null || stat -f "%Sm" "$dir" 2>/dev/null)
      files=$(find "$dir" -type f | wc -l)
      echo "  $(basename "$dir") ($size, $files files) - $date"
    done
  else
    echo "  No storage backups found"
  fi
  echo ""
fi

# Summary
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
echo "Total backup size: $TOTAL_SIZE"
