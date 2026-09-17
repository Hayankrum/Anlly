# Backup Scripts

This directory contains scripts for database and storage backup/restore operations.

## Scripts

### backup-database.sh

Creates a PostgreSQL database backup using `pg_dump`.

```bash
# Basic usage
./backup-database.sh -d "postgresql://user:pass@host:5432/dbname"

# With compression and verbose output
./backup-database.sh -d "$DATABASE_URL" -c -v

# Custom output directory and retention
./backup-database.sh -d "$DATABASE_URL" -o /backups/db -r 60
```

**Options:**
- `-d, --database URL` - Database connection URL
- `-o, --output DIR` - Output directory (default: ./backups/database)
- `-r, --retain DAYS` - Retention period in days (default: 30)
- `-c, --compress` - Enable gzip compression
- `-v, --verbose` - Verbose output

### backup-storage.sh

Syncs S3 bucket to local backup directory.

```bash
# Basic usage
./backup-storage.sh -b my-bucket

# With custom endpoint
./backup-storage.sh -b my-bucket -e https://s3.amazonaws.com
```

**Options:**
- `-b, --bucket NAME` - S3 bucket name
- `-e, --endpoint URL` - S3 endpoint URL
- `-o, --output DIR` - Output directory (default: ./backups/storage)
- `-r, --retain DAYS` - Retention period in days (default: 30)
- `-v, --verbose` - Verbose output

### restore-database.sh

Restores a PostgreSQL database from backup.

```bash
# Basic usage
./restore-database.sh -f backup_20240101_120000.sql

# Skip confirmation
./restore-database.sh -f backup.sql -y
```

**Options:**
- `-f, --file FILE` - Backup file to restore (required)
- `-d, --database URL` - Database connection URL
- `-c, --create` - Create database if not exists
- `-v, --verbose` - Verbose output
- `-y, --yes` - Skip confirmation prompt

### list-backups.sh

Lists all available backups.

```bash
# List all backups
./list-backups.sh

# List only database backups
./list-backups.sh -t database

# List only storage backups
./list-backups.sh -t storage
```

**Options:**
- `-d, --dir DIR` - Backup directory (default: ./backups)
- `-t, --type TYPE` - Filter by type: database, storage, all (default: all)
- `-v, --verbose` - Verbose output

## Automation with Cron

### Daily Database Backup

```bash
# Add to crontab (crontab -e)
# Run daily at 2 AM
0 2 * * * /path/to/scripts/backup/backup-database.sh -d "$DATABASE_URL" -c -v >> /var/log/backup.log 2>&1
```

### Weekly Storage Backup

```bash
# Run weekly on Sunday at 3 AM
0 3 * * 0 /path/to/scripts/backup/backup-storage.sh -b my-bucket -v >> /var/log/backup-storage.log 2>&1
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection URL | Yes |
| `STORAGE_BUCKET` | S3 bucket name | For storage backup |
| `STORAGE_ENDPOINT` | S3 endpoint URL | For custom S3 |
| `STORAGE_ACCESS_KEY` | AWS access key | Yes |
| `STORAGE_SECRET_KEY` | AWS secret key | Yes |
| `STORAGE_REGION` | AWS region (default: sa-east-1) | No |

## Migration Between Providers

### Neon to Another PostgreSQL

```bash
# 1. Backup from Neon
./backup-database.sh -d "postgresql://user:pass@neon-host/dbname" -c

# 2. Restore to new provider
./restore-database.sh -f backup.sql -d "postgresql://user:pass@new-host/dbname"
```

### S3 to Another Storage

```bash
# 1. Backup from S3
./backup-storage.sh -b old-bucket

# 2. Copy to new storage (using aws-cli or rclone)
aws s3 sync ./backups/storage/storage_YYYYMMDD s3://new-bucket/ --endpoint-url NEW_ENDPOINT
```

## Best Practices

1. **Test Restores Regularly** - Always verify backups can be restored
2. **Monitor Backup Logs** - Check logs for errors
3. **Encrypt Sensitive Backups** - Use `gpg` for encryption if needed
4. **Store Backups Offsite** - Keep copies in different regions/providers
5. **Document Procedures** - Maintain runbooks for disaster recovery
