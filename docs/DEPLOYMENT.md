# Guia de Deploy

Instruções para implantar a aplicação em diferentes plataformas.

## Variáveis de Ambiente

Todas as variáveis necessárias estão em `.env.example`. Copie para `.env.local` e preencha:

```bash
cp .env.example .env.local
```

## Vercel

### Deploy Inicial

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel
```

### Configuração via Dashboard

1. Conectar repositório GitHub
2. Configurar variáveis de ambiente em Settings > Environment Variables
3. Deploy automático a cada push

### Variáveis Específicas Vercel

```
PLATFORM=vercel
FORCE_HTTPS=true
```

## Railway

### Deploy

1. Criar conta em [railway.app](https://railway.app)
2. Novo Project > Deploy from GitHub
3. Configurar variáveis em Variables

### Banco de Dados

```bash
# Adicionar PostgreSQL no Railway
railway add postgresql

# A DATABASE_URL será configurada automaticamente
```

## Fly.io

### Instalação

```bash
# Instalar flyctl
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Criar app
fly launch

# Deploy
fly deploy
```

### Banco de Dados

```bash
# Usar PostgreSQL externo ou
# Adicionar via flyctl
fly postgres create
```

## Docker

### Dockerfile

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/mydb
      - AUTH_SECRET=your-secret
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=mydb
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Comandos

```bash
# Build
docker build -t myapp .

# Run
docker run -p 3000:3000 --env-file .env.local myapp

# Docker Compose
docker-compose up -d
```

## Self-Hosted (VPS)

### Pré-requisitos

- Node.js 18+
- PostgreSQL 14+
- Nginx (reverse proxy)
- SSL certificate

### Instalação

```bash
# Clone o repositório
git clone https://github.com/user/repo.git
cd repo

# Instalar dependências
npm install

# Configurar .env
cp .env.example .env.local
# Editar .env.local com suas credenciais

# Build
npm run build

# Iniciar com PM2
npm install -g pm2
pm2 start npm --name "myapp" -- start
pm2 save
pm2 startup
```

### Nginx Config

```nginx
server {
    listen 80;
    server_name example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Migrations

### Antes do Deploy

```bash
# Executar migrações pendentes
npx prisma migrate deploy

# Ou para desenvolvimento
npx prisma migrate dev
```

### Após Deploy

```bash
# Verificar migrações
npx prisma migrate status
```

## Monitoramento

### Health Check

```bash
# Endpoint de health check
curl https://your-app.com/api/health
```

### Logs

```bash
# Vercel
vercel logs

# Railway
railway logs

# Docker
docker logs container_name

# PM2
pm2 logs myapp
```

## Rollback

### Vercel

```bash
# Listar deploys
vercel ls

# Promover deploy anterior
vercel promote <deployment-url>
```

### Docker

```bash
# Usar imagem anterior
docker run -p 3000:3000 myapp:previous-tag
```

### PM2

```bash
# Restart com versão anterior
pm2 restart myapp
```

## SSL/TLS

### Let's Encrypt (Certbot)

```bash
# Instalar certbot
sudo apt install certbot python3-certbot-nginx

# Obter certificado
sudo certbot --nginx -d example.com

# Auto-renewal
sudo certbot renew --dry-run
```

## Checklist de Deploy

- [ ] Variáveis de ambiente configuradas
- [ ] Database migration executada
- [ ] Storage bucket configurado
- [ ] Auth secrets gerados
- [ ] SSL/HTTPS habilitado
- [ ] Health check funcionando
- [ ] Logs monitorados
- [ ] Backup configurado
