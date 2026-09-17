# Arquitetura do Projeto

Visão geral da arquitetura e decisões de design.

## Princípio Fundamental

> "Infraestrutura pode mudar. A regra de negócio deve permanecer."

O projeto é projetado para ser **portável** e **reutilizável**, evitando dependências desnecessárias de provedores específicos.

## Estrutura de Pastas

```
src/
├── app/                          # Next.js App Router (rotas e páginas)
│   ├── api/                      # Endpoints de API REST
│   ├── (routes)/                 # Páginas de interface
│   └── layout.tsx                # Layout raiz
│
├── infrastructure/               # Camada de infraestrutura
│   ├── auth/                     # Autenticação
│   │   ├── AuthProvider.ts       # Interface abstrata
│   │   └── providers/            # Implementações
│   │       ├── NextAuthProvider.ts
│   │       └── CredentialsAuthProvider.ts
│   │
│   ├── database/                 # Banco de dados
│   │   └── prisma.ts             # Configuração Prisma
│   │
│   └── storage/                  # Armazenamento de arquivos
│       ├── StorageProvider.ts    # Interface abstrata
│       └── providers/            # Implementações
│           ├── S3StorageProvider.ts
│           └── LocalStorageProvider.ts
│
├── lib/                          # Utilitários compartilhados
│   ├── auth.ts                   # Configuração NextAuth
│   ├── session.ts                # Gerenciamento de sessões
│   ├── prisma.ts                 # Cliente Prisma
│   ├── useData.ts                # Hooks de dados
│   └── utils.ts                  # Funções utilitárias
│
├── modules/                      # Módulos de domínio
│   ├── usuarios/                 # Usuários
│   │   ├── usuarios.actions.ts   # Server Actions
│   │   ├── components/           # Componentes
│   │   └── pages/                # Páginas
│   │
│   ├── posts/                    # Posts
│   ├── comentarios/              # Comentários
│   ├── media/                    # Mídia
│   ├── mapa/                     # Mapa interativo
│   └── notificacoes/             # Notificações
│
├── components/                   # Componentes compartilhados
└── types/                        # Declarações TypeScript
```

## Camadas da Aplicação

### 1. Interface (UI)
- Componentes React
- Páginas Next.js
- Estilização com Tailwind CSS

### 2. Lógica de Negócio
- Server Actions
- Validação de dados
- Regras específicas do domínio

### 3. Infraestrutura
- Banco de dados (Prisma)
- Storage (S3/Local)
- Autenticação (NextAuth/JWT)
- Notificações Push

### 4. Serviços
- MediaService
- PostService
- UserService

## Princípios de Design

### 1. Portabilidade

```
Regra de negócio → Interface/Serviço → Infraestrutura
```

Exemplo:
```
MediaService → StorageProvider → S3/Neon/Local
```

### 2. Separação de Responsabilidades

- **UI**: Apenas renderização e interação do usuário
- **Server Actions**: Orquestração e validação
- **Services**: Lógica de negócio
- **Infrastructure**: Comunicação com serviços externos

### 3. Inversão de Dependência

Módulos dependem de interfaces, não de implementações:

```typescript
// ✓ Correto
import { StorageProvider } from '@/infrastructure/storage'

// ✗ Errado
import { S3Client } from '@aws-sdk/client-s3'
```

## Fluxo de Dados

### Upload de Arquivo

```
1. Usuário seleciona arquivo
2. UI chama Server Action
3. Server Action valida arquivo
4. MediaService chama StorageProvider
5. StorageProvider envia para S3
6. MediaService salva metadados no Prisma
7. Retorna URL para UI
```

### Autenticação

```
1. Usuário faz login
2. AuthProvider cria sessão
3. Sessão armazenada em cookie
4. Requests futuros usam sessão
5. obterSessao() retorna usuário
```

## Tecnologias

| Camada | Tecnologia | Alternativas |
|--------|------------|--------------|
| Frontend | Next.js 16, React 19 | - |
| Estilo | Tailwind CSS 4 | - |
| Database | PostgreSQL, Prisma 7 | MySQL, SQLite |
| Storage | S3-compatible | GCS, Azure Blob |
| Auth | NextAuth v5 | JWT custom, OAuth2 |
| Deploy | Vercel | Railway, Fly.io, Docker |

## Segurança

- Validação de entrada em Server Actions
- Autorização em todas as operações
- Sanitização de dados
- CSP headers em produção
- Rate limiting (quando necessário)

## Performance

- Server Components quando possível
- Lazy loading de componentes
- Paginação de dados
- Índices no banco de dados
- Cache apropriado

## Portabilidade

### Trocar Banco de Dados

1. Atualizar `DATABASE_URL` em `.env`
2. Executar `npx prisma migrate dev`
3. Pronto!

### Trocar Storage

1. Atualizar `STORAGE_PROVIDER` em `.env`
2. Configurar variáveis do novo provedor
3. Pronto!

### Trocar Auth

1. Atualizar `AUTH_PROVIDER` em `.env`
2. Criar novo provider em `infrastructure/auth/providers/`
3. Adicionar case no `index.ts`
4. Pronto!
