-- A coluna "dias" precisou ser criada para o backfill abaixo.
ALTER TABLE "Event" ADD COLUMN "dias" JSONB;

-- Eventos com fim no mesmo dia do início (o intervalo começa em startsAt).
UPDATE "Event"
SET "dias" = (
  SELECT jsonb_agg(to_char(d, 'YYYY-MM-DD') ORDER BY d)
  FROM generate_series(
    date_trunc('day', "startsAt"),
    COALESCE("endsAt", "startsAt"),
    interval '1 day'
  ) AS d
)
WHERE "endsAt" IS NOT NULL AND date_trunc('day', "endsAt") > date_trunc('day', "startsAt");

UPDATE "Event"
SET "dias" = jsonb_build_array(to_char("startsAt", 'YYYY-MM-DD'))
WHERE "dias" IS NULL;