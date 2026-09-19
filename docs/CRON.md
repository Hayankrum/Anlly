# Agendamento dos lembretes

Os lembretes são disparados pela rota `POST /api/cron/lembretes`, protegida por
`CRON_SECRET` (veja a Etapa 5). Essa rota precisa ser chamada periodicamente por
um agendador externo.

> O Neon (Postgres) **não** oferece `pg_cron`, por isso o agendamento é feito fora
> do banco. A rota é idempotente: mesmo que o agendador execute duas vezes no mesmo
> horário, cada lembrete só é enviado uma vez (reserva atômica de `sentAt`).

Intervalo recomendado: **a cada 5 minutos**.

## Opção A — GitHub Actions (recomendado)

Já incluído em `.github/workflows/lembretes.yml`. Roda a cada 5 minutos e também
pode ser disparado manualmente.

1. No repositório, vá em **Settings → Secrets and variables → Actions**.
2. Crie os secrets:
   - `APP_URL`: URL pública do app **sem barra no final** (ex.: `https://meu-app.vercel.app`).
   - `CRON_SECRET`: o mesmo valor de `CRON_SECRET` configurado no ambiente do app.
3. Para testar: **Actions → Disparar lembretes → Run workflow**.

Observações:

- O agendador do GitHub é *best-effort* — em horários de pico pode atrasar alguns minutos.
- Repositórios públicos executam Actions gratuitamente; privados consomem a cota mensal
  (execuções de 5 em 5 minutos ficam dentro do plano gratuito na maioria dos casos).

## Opção B — cron-job.org

Serviço gratuito, aceita intervalo de 1 minuto.

1. Crie uma conta em [cron-job.org](https://cron-job.org).
2. **Create cronjob**:
   - URL: `https://SEU-APP/api/cron/lembretes`
   - Schedule: a cada 5 minutos.
   - Habilitar **Advanced → Request method: POST**.
   - **Advanced → Headers**: `Authorization` = `Bearer SEU_CRON_SECRET`.
3. Salve e use **TEST RUN** para validar.

## Opção C — Vercel Cron

Se o deploy for na Vercel, crie `vercel.json` na raiz:

```json
{
  "crons": [
    { "path": "/api/cron/lembretes", "schedule": "*/5 * * * *" }
  ]
}
```

Defina `CRON_SECRET` nas Environment Variables da Vercel. A Vercel envia
automaticamente `Authorization: Bearer $CRON_SECRET` nas chamadas do cron.

> No plano Hobby a granularidade dos crons é limitada (normalmente diária);
> intervalos de minutos exigem plano Pro. Nesse caso, prefira a Opção A ou B.

## Teste local

```bash
SECRET=$(grep '^CRON_SECRET=' .env | cut -d= -f2-)
curl -H "Authorization: Bearer $SECRET" http://localhost:3000/api/cron/lembretes
```

A resposta traz `{ verificados, enviados, ignorados }`:

- `verificados`: lembretes vencidos encontrados nesta execução.
- `enviados`: lembretes reservados e notificados.
- `ignorados`: reservados por outra execução ou de evento concluído.

## Segurança

- Nunca faça commit do `CRON_SECRET`; use secrets do agendador e `.env` local.
- Prefira o header `Authorization: Bearer ...` a passar o segredo na query string
  (a URL pode aparecer em logs).
- Sem `CRON_SECRET` configurado a rota responde `500`; segredo ausente/errado responde `401`.
