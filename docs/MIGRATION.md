# Guia de Migração

Instruções para migrar entre provedores de infraestrutura.

## Migração de Banco de Dados

### Neon → Outro PostgreSQL

#### 1. Backup do Neon

```bash
# Usar script de backup
./scripts/backup/backup-database.sh \
  -d "postgresql://neondb_owner:password@ep-xxx.sa-east-1.aws.neon.tech/neondb?sslmode=require" \
  -c -v
```

Ou manualmente:

```bash
pg_dump "postgresql://neondb_owner:password@ep-xxx.sa-east-1.aws.neon.tech/neondb?sslmode=require" \
  --format=plain \
  --no-owner \
  > backup.sql
```

#### 2. Restaurar no Novo Provedor

```bash
# Usar script de restauração
./scripts/backup/restore-database.sh \
  -f backup_YYYYMMDD_HHMMSS.sql \
  -d "postgresql://user:password@new-host:5432/dbname" \
  -c -v
```

Ou manualmente:

```bash
psql "postgresql://user:password@new-host:5432/dbname" < backup.sql
```

#### 3. Atualizar Variáveis de Ambiente

```bash
# .env
DATABASE_URL="postgresql://user:password@new-host:5432/dbname?schema=public"
```

#### 4. Executar Migrações

```bash
npx prisma migrate dev
npx prisma generate
```

### Railway

```bash
# DATABASE_URL do Railway
DATABASE_URL="postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway"
```

### Supabase

```bash
# DATABASE_URL do Supabase
DATABASE_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"
```

### AWS RDS

```bash
# DATABASE_URL do RDS
DATABASE_URL="postgresql://user:password@xxx.us-east-1.rds.amazonaws.com:5432/mydb"
```

### Self-Hosted

```bash
# DATABASE_URL local/remoto
DATABASE_URL="postgresql://user:password@192.168.1.100:5432/mydb"
```

## Migração de Storage

### S3 → Outro S3-Compatible

#### 1. Backup do Storage Atual

```bash
./scripts/backup/backup-storage.sh \
  -b old-bucket \
  -v
```

#### 2. Sincronizar com Novo Bucket

```bash
# AWS CLI
aws s3 sync ./backups/storage/storage_YYYYMMDD s3://new-bucket/ \
  --endpoint-url https://new-endpoint.com

# ou rclone
rclone sync ./backups/storage/storage_YYYYMMDD remote:new-bucket/
```

#### 3. Atualizar Variáveis de Ambiente

```bash
# .env
STORAGE_PROVIDER=s3
STORAGE_BUCKET=new-bucket
STORAGE_ENDPOINT=https://new-endpoint.com
STORAGE_REGION=new-region
STORAGE_ACCESS_KEY=new-key
STORAGE_SECRET_KEY=new-secret
```

### Cloudflare R2

```bash
STORAGE_PROVIDER=s3
STORAGE_BUCKET=my-bucket
STORAGE_ENDPOINT=https://xxx.r2.cloudflarestorage.com
STORAGE_REGION=auto
STORAGE_ACCESS_KEY=your-access-key
STORAGE_SECRET_KEY=your-secret-key
STORAGE_FORCE_PATH_STYLE=true
```

### MinIO (Self-Hosted)

```bash
STORAGE_PROVIDER=s3
STORAGE_BUCKET=my-bucket
STORAGE_ENDPOINT=http://minio.example.com:9000
STORAGE_REGION=minio
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin
STORAGE_FORCE_PATH_STYLE=true
```

### Google Cloud Storage

```bash
STORAGE_PROVIDER=s3
STORAGE_BUCKET=my-bucket
STORAGE_ENDPOINT=https://storage.googleapis.com
STORAGE_REGION=us-central1
STORAGE_ACCESS_KEY=your-access-key
STORAGE_SECRET_KEY=your-secret-key
```

## Migração de Auth

### NextAuth → JWT Customizado

```bash
# .env
AUTH_PROVIDER=credentials
AUTH_SECRET=your-jwt-secret
```

### NextAuth → Outro Provider

1. Criar novo provider em `src/infrastructure/auth/providers/`
2. Implementar interface `AuthProvider`
3. Adicionar case em `src/infrastructure/auth/index.ts`
4. Atualizar `AUTH_PROVIDER` em `.env`

## Migração Completa

### Checklist

- [ ] Backup do banco de dados
- [ ] Backup do storage
- [ ] Testar restore do banco
- [ ] Testar restore do storage
- [ ] Atualizar variáveis de ambiente
- [ ] Executar migrações do Prisma
- [ ] Testar autenticação
- [ ] Testar uploads
- [ ] Testar notificações push
- [ ] Verificar logs de erro

### Ordem Recomendada

1. **Banco de dados** - Mais crítico, dados precisam estar íntegros
2. **Storage** - Arquivos podem ser restaurados depois
3. **Auth** - Configurar após banco estabilizado
4. **Notificações** - Último item, menos crítico

## Rollback

### Para Voltar ao Provedor Anterior

1. Manter backup do provedor anterior
2. Seguir mesma processo de migração
3. Restaurar backup anterior
4. Reverter variáveis de ambiente

### Estratégia de Rollback

```bash
# 1. Criar backup do estado atual
./scripts/backup/backup-database.sh -d "$DATABASE_URL" -c

# 2. Restaurar backup anterior
./scripts/backup/restore-database.sh -f backup_anterior.sql -d "$DATABASE_URL"

# 3. Reverter .env
git checkout .env
```

## Troubleshooting

### Erro: "relation does not exist"

```bash
# Executar migrações pendentes
npx prisma migrate dev
```

### Erro: "permission denied"

```bash
# Verificar permissões do usuário no banco
GRANT ALL PRIVILEGES ON DATABASE mydb TO myuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO myuser;
```

### Erro: "connection refused"

```bash
# Verificar se o banco está acessível
pg_isready -h host -p 5432
```

### Storage: "Access Denied"

```bash
# Verificar credenciais e permissões do bucket
aws s3 ls s3://my-bucket --endpoint-url https://endpoint.com
```
