-- Converte o antigo modelo de quadros em itens com parentId e quadroKanban.
-- Em instalações novas, as tabelas antigas não existem e esta etapa é no-op.
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.quadro') IS NOT NULL
     AND to_regclass('public.coluna') IS NOT NULL
     AND to_regclass('public.card') IS NOT NULL THEN
    CREATE TEMP TABLE "_legacy_item_sequences" ON COMMIT DROP AS
    WITH fontes AS (
      SELECT id, "userId", "criadoEm", "serverSeq", 0 AS ordem_tipo
      FROM quadro
      UNION ALL
      SELECT id, "userId", "criadoEm", "serverSeq", 1 AS ordem_tipo
      FROM card
    ),
    bases AS (
      SELECT
        u.id AS "userId",
        GREATEST(
          u.seq,
          COALESCE((SELECT MAX(i."serverSeq") FROM item i WHERE i."userId" = u.id), 0),
          COALESCE((SELECT MAX(q."serverSeq") FROM quadro q WHERE q."userId" = u.id), 0),
          COALESCE((SELECT MAX(c."serverSeq") FROM coluna c WHERE c."userId" = u.id), 0),
          COALESCE((SELECT MAX(ca."serverSeq") FROM card ca WHERE ca."userId" = u.id), 0)
        ) AS base
      FROM "user" u
      WHERE EXISTS (SELECT 1 FROM quadro q WHERE q."userId" = u.id)
         OR EXISTS (SELECT 1 FROM card ca WHERE ca."userId" = u.id)
    ),
    numeradas AS (
      SELECT
        f.id,
        f."userId",
        b.base + ROW_NUMBER() OVER (
          PARTITION BY f."userId"
          ORDER BY f.ordem_tipo, f."criadoEm", f.id
        ) AS "serverSeq"
      FROM fontes f
      JOIN bases b ON b."userId" = f."userId"
    )
    SELECT id, "userId", "serverSeq" FROM numeradas;

    INSERT INTO item (
      id, "userId", titulo, descricao, concluido, tipo, "parentId", coluna, ordem,
      "quadroKanban", "diasAgendamento", "horaAgendamento", "criadoEm", "updatedAt",
      "deletedAt", "serverSeq"
    )
    SELECT
      q.id,
      q."userId",
      q.titulo,
      q.descricao,
      EXISTS (
        SELECT 1
        FROM card ca
        JOIN coluna c ON c.id = ca."colunaId"
        WHERE ca."quadroId" = q.id
          AND ca."deletedAt" IS NULL
          AND (
            c.conclusao
            OR (
              NOT EXISTS (SELECT 1 FROM coluna cx WHERE cx."quadroId" = q.id AND cx.conclusao)
              AND c.id = (
                SELECT cmax.id FROM coluna cmax
                WHERE cmax."quadroId" = q.id
                ORDER BY cmax.ordem DESC, cmax.id DESC LIMIT 1
              )
            )
          )
      )
      AND EXISTS (SELECT 1 FROM card ca WHERE ca."quadroId" = q.id AND ca."deletedAt" IS NULL),
      'kanban',
      NULL,
      NULL,
      NULL,
      CASE
        WHEN EXISTS (SELECT 1 FROM coluna c WHERE c."quadroId" = q.id) THEN
          jsonb_build_object(
            'colunas',
            (
              SELECT jsonb_agg(
                jsonb_build_object('id', c.id, 'titulo', c.titulo)
                ORDER BY c.ordem, c.id
              )
              FROM coluna c WHERE c."quadroId" = q.id
            ),
            'colunaConclusao',
            COALESCE(
              (
                SELECT c.id FROM coluna c
                WHERE c."quadroId" = q.id AND c.conclusao
                ORDER BY c.ordem DESC, c.id DESC LIMIT 1
              ),
              (
                SELECT c.id FROM coluna c
                WHERE c."quadroId" = q.id
                ORDER BY c.ordem DESC, c.id DESC LIMIT 1
              )
            )
          )
        ELSE
          '{"colunas":[{"id":"afazer","titulo":"A Fazer"},{"id":"fazendo","titulo":"Fazendo"},{"id":"feito","titulo":"Feito"}],"colunaConclusao":"feito"}'::jsonb
      END,
      COALESCE(q."diasAgendamento", ARRAY[]::TEXT[]),
      q."horaAgendamento",
      q."criadoEm",
      q."updatedAt",
      q."deletedAt",
      s."serverSeq"
    FROM quadro q
    JOIN "_legacy_item_sequences" s ON s.id = q.id AND s."userId" = q."userId";

    INSERT INTO item (
      id, "userId", titulo, descricao, concluido, tipo, "parentId", coluna, ordem,
      "criadoEm", "updatedAt", "deletedAt", "serverSeq"
    )
    SELECT
      ca.id,
      ca."userId",
      ca.titulo,
      ca.descricao,
      c.conclusao OR (
        NOT EXISTS (
          SELECT 1 FROM coluna cx
          WHERE cx."quadroId" = ca."quadroId" AND cx.conclusao
        )
        AND c.id = (
          SELECT cmax.id FROM coluna cmax
          WHERE cmax."quadroId" = ca."quadroId"
          ORDER BY cmax.ordem DESC, cmax.id DESC LIMIT 1
        )
      ),
      'padrao',
      ca."quadroId",
      ca."colunaId",
      ca.ordem,
      ca."criadoEm",
      ca."updatedAt",
      ca."deletedAt",
      s."serverSeq"
    FROM card ca
    JOIN coluna c ON c.id = ca."colunaId"
    JOIN "_legacy_item_sequences" s ON s.id = ca.id AND s."userId" = ca."userId";

    UPDATE "user" u
    SET seq = GREATEST(u.seq, s.max_seq)
    FROM (
      SELECT "userId", MAX("serverSeq") AS max_seq
      FROM "_legacy_item_sequences"
      GROUP BY "userId"
    ) s
    WHERE u.id = s."userId";

    DROP TABLE card;
    DROP TABLE coluna;
    DROP TABLE quadro;
  END IF;
END $$;

COMMIT;
