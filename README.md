# Anlly — organize seu dia a dia

App pessoal offline-first para acompanhar o dia a dia: **Vite + React 19 + Dexie**
no cliente (100% offline, a UI lê e escreve só no IndexedDB) e **Hono + Prisma +
Postgres + better-auth** no servidor (mesma origem, sem CORS). A nuvem é uma
réplica sincronizada em segundo plano via outbox.

O plano de evolução e as notas de cada etapa estão em [PLAN.md](./PLAN.md).

## Requisitos

- Node 22+ (testado com Node 26)
- Docker + Docker Compose (para Postgres e para o deploy)

## Começando rápido (docker)

```bash
cp .env.example .env         # preencha AUTH_SECRET (openssl rand -base64 32)
docker compose up -d postgres
docker compose run --rm migrate    # aplica as migrations (passo explícito)
npm install
npm run dev                  # Vite em :5173 + API em :3000 (proxy /api)
```

`npm run dev` sobe **os dois processos** (web e api) com `concurrently`; o
navegador fala só com `:5173` e o Vite repassa `/api` (com cookies) para `:3000`.

Para subir o app completo em produção via Docker:

```bash
docker compose up --build app   # app em http://localhost:3000 (serve dist/ + API)
```

## Começando rápido (Postgres local, sem docker no app)

```bash
cp .env.example .env         # aponte DATABASE_URL para o seu Postgres
npm install
npm run db:migrate           # prisma migrate dev (--config explícito)
npm run dev
```

## Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | Vite (`:5173`, proxy `/api`) + servidor com `tsx watch` (`:3000`) |
| `npm run build` | typecheck (client+server) + `dist/` do cliente + `dist-server/index.js` (esbuild) |
| `npm start` | produção: **um processo, uma porta** — `node dist-server/index.js` serve API e `dist/` |
| `npm run typecheck` | `tsc` nos dois projetos (client e server) |
| `npm run db:migrate` | `prisma migrate dev --config prisma7.config.ts` |
| `npm run db:deploy` | `prisma migrate deploy --config prisma7.config.ts` (produção/Docker) |
| `npm run db:studio` | Prisma Studio |
| `npm run icons` | regenera PNGs dos ícones a partir dos SVGs |

Produção sem Docker: `npm run build && npm start` (usa `.env` se existir).

## Variáveis de ambiente

Ver [`.env.example`](./.env.example): `DATABASE_URL`, `AUTH_SECRET` (≥32 chars),
`APP_URL` (origem pública; em dev é a do Vite — o servidor aceita
`localhost:5173` como `trustedOrigins` somente em `NODE_ENV=development`),
`PORT`, `NODE_ENV`. Validadas com Zod em `server/env.ts`.

Para recuperação de senha ("Esqueci minha senha"), configure as variáveis SMTP
(`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`). Sem elas o
fluxo retorna erro — o app continua funcional, apenas sem essa feature.

## Segurança

- **Headers** (todos os caminhos, `server/app.ts`): CSP estrita
  (`script-src 'self'` — o anti-flash de tema é `public/theme-init.js` externo;
  `style-src` aceita inline só por atributos `style`), `X-Content-Type-Options`,
  `X-Frame-Options: DENY` + `frame-ancestors 'none'`, `Referrer-Policy:
  no-referrer`, `Permissions-Policy` (câmera/mic/geolocalização/pagamento
  desligados), COOP/CORP `same-origin`. Com `APP_URL` https, soma HSTS +
  `upgrade-insecure-requests` (coloque o app atrás de um proxy TLS em produção).
- **Corpos**: `bodyLimit` de 2 MB em `/api/*` (413 acima disso).
- **Sessão**: cookie HttpOnly + SameSite do better-auth (nada em
  localStorage); better-auth exige `Origin` em POST (CSRF); rate-limit
  ativo em produção (120 req/min por IP).
- **Dados**: Zod em todo payload (`shared/`), Prisma parametrizado, segredos
  só no `.env` (o build do cliente não vê `AUTH_SECRET`/`DATABASE_URL`).

## Estrutura

```
src/            cliente (Vite + React + Dexie + PWA)
server/         API Hono (auth, sync push/pull, estáticos em produção)
shared/         schemas Zod usados por cliente e servidor (@shared/*)
prisma/         schema.prisma + migrations
Dockerfile      multi-stage: deps → build → runtime (non-root, só prod)
docker-compose.yml  app + postgres (healthcheck; migrations via `run --rm migrate`)
```

Regras de camada do cliente:

- Componentes **nunca** importam o Dexie. Todo acesso passa por
  `items.repo.ts`/`config.repo.ts`; leituras reativas com `useLiveQuery`
  (`useItems`, `useSettings`).
- Toda escrita grava o registro **e** a entrada no outbox na mesma transação
  Dexie — o SyncEngine (etapa E) envia o outbox para `/api/sync/push`.
- Sync: `POST /api/sync/push` idempotente por id de mutação (LWW por
  `updatedAt`, `serverVersion` = `serverSeq`); `GET /api/sync/pull?cursor=N`
  paginado com cursor monotônico **por usuário**. Sessão better-auth obrigatória.
- Conta (`features/conta/`): tela em `/conta` (entrar/criar/sair via
  `/api/auth/*`), indicador de fase do sync no TopNav (`useSyncStatus`) e o
  guarda de troca de conta — ao conectar, `conectar()` enfileira na outbox os
  itens que faltam (**inclusive tombstones**) e, se quem entrou é outro
  usuário, apaga itens+outbox e zera o cursor para não misturar contas.

## Ícones

SVGs em `public/icons/`; PNGs gerados — regenere com `npm run icons` (requer
`rsvg-convert`, ImageMagick ou Inkscape) e refaça o `build`.

## Limitações conhecidas

- iOS/Safari: sem `beforeinstallprompt` (modal manual) e sem
  `storage.persist()`; sem push notifications e sem background sync.
- O Service Worker só roda em contexto seguro (HTTPS ou `localhost`).
- Sync: ao baixar dados da conta, o app verifica espaço antes de gravar
  (margem conservadora) e, se faltar, não avança o cursor nem faz retry
  automático — ver instruções na tela de Conta/Ajustes.
- Recuperação de senha requer SMTP configurado; sem ele, o botão "Esqueci
  minha senha" retorna erro de indisponibilidade.
