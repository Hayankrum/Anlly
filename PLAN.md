# Plano — base Vite fullstack (protótipo)

Um repo, um package.json, um deploy. Cliente offline-first (Dexie como fonte da
verdade local), nuvem como réplica sincronizada. Protótipo: sem dados a preservar —
mudanças de schema do Dexie podem recriar o banco (sem `.upgrade()`).

| Etapa | Descrição | Status |
|---|---|---|
| A | Preparar cliente para sincronizar (campos de sync, outbox, syncState) | ✅ |
| B | Pacote `shared/` com schemas Zod | ✅ |
| C | Servidor Hono + Prisma + better-auth, push idempotente, pull por cursor | ✅ |
| D | Dev e build unificados (um processo em produção) | ✅ |
| E | SyncEngine no cliente (push/pull em segundo plano) | ✅ |
| F | Conta e estado na interface | ✅ |
| G | PWA e segurança | ✅ |

## Notas pendentes

- **Etapa E (feita)**: outbox compactado por `(tabela, registroId)` antes de
  cada push; backoff 2s→5min; `get-session` é o probe de rede/sessão (falha de
  fetch = offline real, sem depender de `navigator.onLine`) — por isso o
  rate-limit do better-auth ficou só em produção (120/min), em dev free.
- **Etapa F (feita)**: rota `/conta` (entrar/criar conta, sair, status do sync
  com "Sincronizar agora") + indicador de fase no TopNav. Ao conectar conta:
  enfileira na outbox **todos os itens sem mutação pendente, inclusive
  tombstones** (a compactação por registro garante "sem duplicar"); guarda de
  troca de conta: `ultimoUsuarioId` em `config` — se o login for de outra
  conta, itens+outbox são apagados e o cursor volta a `0` (não mistura
  contas). Saída limpa só a sessão local; os dados ficam no aparelho.
- **Etapa G (feita)**: CSP estrita (`script-src 'self'` — o tema anti-flash saiu
  do inline e virou `public/theme-init.js`, versionado no precache), headers de
  segurança em `server/app.ts` (nosniff, frame-ancestors DENY, referrer,
  permissions-policy, COOP/CORP; HSTS + `upgrade-insecure-requests` quando
  `APP_URL` é https), `bodyLimit` de 2 MB em `/api/*` (413 acima disso).
  `theme-init.js` servido com `Cache-Control: no-cache` junto com index/sw/manifest.
  Auditoria: better-auth telemetry off por padrão (1.7.7), cookies HttpOnly +
  SameSite + checagem de Origin, Prisma parametrizado, segredos só no `.env`.
  Rate-limit (produção): 120/min geral **mais** a regra especial do better-auth
  de 3 sign-in/sign-up a cada 10s de silêncio (anti brute-force; por isso o
  harness de aceitação ritma os logins).
- **Falta (passo final, após G)**: teste de aceitação completo — dois
  navegadores reais, offline/modo avião e idempotência (a aproximação
  automatizada de dois "dispositivos" via harness Node já cobre sync em
  processos separados contra o mesmo servidor).
- **Robustez do sync (2ª rodada)**: push com `invalida` descarta a mutação e
  avisa (`status.rejeitadas` na tela de Conta); mutação sem resultado no push
  conta tentativa e é descartada em `LIMITE_TENTATIVAS` (não reenvia para
  sempre); `SyncMutation` gravada também para `invalida` (replay vira
  resposta estável); relógio do cliente limitado a [−90d, +5min] no push (um
  relógio absurdamente errado não vence LWW para sempre); upsert sem
  `deletedAt` não ressuscita tombstone; rodadas de sync serializadas entre
  abas via Web Locks (`navigator.locks`), com fallback sem trava.
- Quando houver usuários reais, toda mudança de schema do Dexie exige nova
  `db.version(n)` com `.upgrade()` (o protótipo atual usa `version(1)` único e
  pode simplesmente recriar o IndexedDB).

## Política de armazenamento local

- **Cota do navegador**: escritas que estouram a cota viram `ErroCotaExcedida`
  (mensagem clara + saída para Configurações); alerta automático aos 80% do
  uso (`useAlertaCota`); contador de pendências do outbox na tela de Conta,
  com aviso forte quando a persistência não foi concedida.
- **Proteção no pull**: o sync checa se há espaço antes de baixar uma página
  (~2KB por item + 5MB de margem) e, se falhar por quota, não avança o cursor,
  não reenvia em loop e mostra orientação para liberar espaço.
- **Limpeza**: tombstones confirmados são apagados após o push; Ajustes →
  "Liberar espaço local" remove itens sincronizados com mais de 90 dias
  (continuam na conta) e "Baixar tudo de novo" zera o cursor para rebaixar.
- **Fotos (quando existirem)**: vão para armazenamento de objetos do servidor
  (S3/R2 ou similar) via upload direto; o IndexedDB guarda só a referência e,
  se precisar de preview, uma miniatura pequena. Blob de foto cheia no
  IndexedDB é o que estoura a cota — nunca fazer isso.
- **iOS**: incentivar instalação na tela de início (modal e Ajustes): o PWA
  instalado tem proteção bem melhor contra limpeza de dados pelo sistema.

## Aceitação

**Automatizada (feita)** — harness em `/tmp/opencode/e2e` (fora do repo, sem
deps novas): `node entry.mjs` roda 55 verificações do SyncEngine+conta contra
o servidor real; `node aceitacao.mjs <papel> <email> <senha>` simula
dispositivos em processos separados (IndexedDB isolado), ritmados com
≥12s entre logins (regra do better-auth: 3 sign-in a cada 10s de silêncio):
`criar-conta` → `segundo-dispositivo` → `volta-dispositivo-a` →
`offline-depois` → `conferir-final`. Cobre: nuvem como réplica (pull nos dois
aparelhos), idempotência (re-sync não avança cursor), edição offline
enviada depois, convergência final (9 itens nos dois lados).

**Manual (resta ao humano, precisa de navegador real)**:

1. `npm run dev` em Chrome e em Firefox/Safari (ou perfis separados) na mesma
   máquina; criar conta em um, entrar no outro; itens criados num aparecem
   no outro em segundos (indicador do TopNav volta a "Sincronizado").
2. DevTools → Network → Offline no aparelho A: criar/editar itens; voltar a
   online; B recebe tudo; nenhum erro permanente no cartão de Sincronização.
3. Instalar a PWA (banner/Ajustes), fechar e reabrir pelo ícone, ativar modo
   avião: app abre, itens carregam, criar funciona; sair do avião sincroniza.
4. Trocar de aba/minimizar com pendências: sync roda sozinho ao voltar.
5. Editar o mesmo item nos dois aparelhos offline; ao reconectar, vence o
   último `updatedAt` nos dois lados (LWW) — sem duplicar nem sumir.
6. Sair da conta: dados continuam locais; entrar com outra conta apaga
   (com o aviso na tela de Conta).
