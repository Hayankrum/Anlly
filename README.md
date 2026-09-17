# Next.js Base Template

Base reutilizável e portável para projetos Next.js com PostgreSQL, Storage e Autenticação.

> **Princípio Fundamental:** "Infraestrutura pode mudar. A regra de negócio deve permanecer."

## Características

- **Portável** - Troque provedores sem reescrever código
- **Modular** - Arquitetura limpa e organizada
- **Segura** - Validação, autorização e boas práticas
- **Performática** - Otimizada para produção
- **PWA** - Suporte offline e notificações push

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js 16, React 19, TypeScript |
| Estilo | Tailwind CSS 4 |
| Database | PostgreSQL (via Prisma 7) |
| Storage | S3-compatible (AWS, R2, MinIO) |
| Auth | NextAuth v5 ou JWT customizado |
| Deploy | Vercel, Railway, Docker, Self-hosted |

## Início Rápido

```bash
# Clone
git clone https://github.com/user/repo.git
cd repo

# Instale
npm install

# Configure
cp .env.example .env.local
# Edite .env.local com suas credenciais

# Migre o banco
npx prisma migrate dev

# Execute
npm run dev
```

Acesse http://localhost:3000

## Documentação

- [Arquitetura](docs/ARCHITECTURE.md) - Estrutura e decisões de design
- [Migração](docs/MIGRATION.md) - Trocar entre provedores
- [Deploy](docs/DEPLOYMENT.md) - Implantar em diferentes plataformas
- [Desenvolvimento](docs/DEVELOPMENT.md) - Setup local e guia de contribuição

## Estrutura

```
src/
├── app/                    # Rotas Next.js
├── infrastructure/         # Auth, Database, Storage
├── lib/                    # Utilitários
├── modules/                # Módulos de domínio
├── components/             # Componentes compartilhados
└── types/                  # Declarações TypeScript
```

## Portabilidade

### Trocar Banco de Dados

```bash
# 1. Atualize DATABASE_URL em .env
# 2. Execute migrações
npx prisma migrate deploy
```

### Trocar Storage

```bash
# 1. Atualize STORAGE_PROVIDER e variáveis em .env
# 2. Pronto!
```

### Trocar Auth

```bash
# 1. Atualize AUTH_PROVIDER em .env
# 2. Ou crie novo provider em src/infrastructure/auth/providers/
```

## Scripts de Backup

```bash
# Backup do banco
./scripts/backup/backup-database.sh -d "$DATABASE_URL" -c

# Backup do storage
./scripts/backup/backup-storage.sh -b my-bucket

# Listar backups
./scripts/backup/list-backups.sh
```

## Variáveis de Ambiente

Todas as variáveis estão documentadas em `.env.example`.

Variáveis principais:

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Conexão PostgreSQL |
| `AUTH_SECRET` | Segredo para autenticação |
| `STORAGE_PROVIDER` | Provedor de storage (local/s3) |
| `STORAGE_BUCKET` | Nome do bucket S3 |

## Tecnologias

- **Next.js 16** - Framework React full-stack
- **React 19** - Biblioteca de interfaces
- **TypeScript** - Tipagem estática
- **Tailwind CSS 4** - CSS utility-first
- **Prisma 7** - ORM para PostgreSQL
- **NextAuth v5** - Autenticação
- **Leaflet** - Mapas interativos
- **Web Push** - Notificações push

## Licença

MIT
