# Guia de Desenvolvimento

Instruções para configurar e executar o projeto localmente.

## Pré-requisitos

- Node.js 18+ (recomendado: [nvm](https://github.com/nvm-sh/nvm))
- npm ou yarn
- PostgreSQL 14+ (ou use Docker)

## Início Rápido

### 1. Clone o Repositório

```bash
git clone https://github.com/user/repo.git
cd repo
```

### 2. Instale Dependências

```bash
npm install
```

### 3. Configure o Ambiente

```bash
cp .env.example .env.local
```

Edite `.env.local` com suas credenciais:

```bash
# Database (pode usar Docker abaixo)
DATABASE_URL="postgresql://postgres:password@localhost:5432/mydb"

# Auth (gere um secret)
AUTH_SECRET="openssl rand -base64 32"
AUTH_SECRET=your-generated-secret

# Google OAuth (obtenha no Google Console)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Storage local
STORAGE_PROVIDER=local
STORAGE_UPLOAD_DIR=./public/uploads
STORAGE_BASE_URL=/uploads
```

### 4. Execute as Migrações

```bash
npx prisma migrate dev
npx prisma generate
```

### 5. Inicie o Servidor de Desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:3000

## Docker para Desenvolvimento

### Database com Docker

```bash
# PostgreSQL
docker run -d \
  --name mydb-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=mydb \
  -p 5432:5432 \
  postgres:16-alpine
```

### Docker Compose Completo

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: mydb
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  minio_data:
```

```bash
docker-compose -f docker-compose.dev.yml up -d
```

## Comandos Úteis

### Desenvolvimento

```bash
npm run dev          # Iniciar dev server
npm run build        # Build de produção
npm run start        # Iniciar produção
npm run lint         # Rodar ESLint
```

### Banco de Dados

```bash
npx prisma migrate dev        # Criar migração
npx prisma migrate deploy     # Aplicar migrações
npx prisma migrate status     # Verificar status
npx prisma generate           # Gerar Prisma Client
npx prisma studio             # Abrir Prisma Studio
npx prisma db seed            # Rodar seed
```

### Storage

```bash
# Criar bucket local (MinIO)
mc alias set local http://localhost:9000 minioadmin minioadmin
mc mb local/my-bucket
```

## Estrutura de Trabalho

### Criar Nova Feature

1. Criar branch: `git checkout -b feature/nome`
2. Criar módulo em `src/modules/nome/`
3. Adicionar rotas em `src/app/nome/`
4. Criar Server Actions se necessário
5. Testar localmente
6. Criar PR

### Adicionar Nova Rota API

1. Criar arquivo em `src/app/api/nome/route.ts`
2. Implementar GET, POST, etc.
3. Testar com curl ou Insomnia

### Criar Nova Server Action

1. Criar arquivo `nome.actions.ts` no módulo
2. Adicionar `'use server'` no início
3. Validar entrada
4. Chamar serviço apropriado
5. Retornar resultado

## Debugging

### VS Code

Configuração em `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Next.js Dev Server",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Chrome DevTools

1. Abra `http://localhost:3000`
2. F12 > Sources > Add folder
3. Adicione `src/` para debugar

### Prisma Studio

```bash
npx prisma studio
```

Acesse: http://localhost:5555

## Testes

### Rodar Testes

```bash
npm test
```

### Testes E2E (se configurado)

```bash
npx playwright test
```

## Variáveis de Ambiente para Dev

### Obrigatórias

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | URL do PostgreSQL | `postgresql://...` |
| `AUTH_SECRET` | Segredo para JWT | `random-string` |
| `GOOGLE_CLIENT_ID` | Client ID do Google | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Client Secret | `GOCSPX-xxx` |

### Opcionais

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `AUTH_PROVIDER` | Provedor de auth | `nextauth` |
| `STORAGE_PROVIDER` | Provedor de storage | `local` |
| `STORAGE_UPLOAD_DIR` | Diretório local | `./public/uploads` |
| `FORCE_HTTPS` | Forçar HTTPS | `false` |

## Performance

### Bundle Analyzer

```bash
ANALYZE=true npm run build
```

### Lighthouse

```bash
npx lighthouse http://localhost:3000 --view
```

## Troubleshooting

### Erro: "Module not found"

```bash
# Limpar cache
rm -rf node_modules .next
npm install
```

### Erro: "Database connection refused"

```bash
# Verificar se PostgreSQL está rodando
docker ps
# ou
pg_isready -h localhost -p 5432
```

### Erro: "Prisma Client not generated"

```bash
npx prisma generate
```

### Erro: "Port already in use"

```bash
# Matar processo na porta 3000
lsof -ti:3000 | xargs kill -9
```
