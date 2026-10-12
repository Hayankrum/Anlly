-- Agendamento com vários dias: dataAgendamento (dia único) vira
-- diasAgendamento (array de YYYY-MM-DD). O horário continua único (HH:mm).
ALTER TABLE "item" ADD COLUMN "diasAgendamento" TEXT[];
UPDATE "item" SET "diasAgendamento" = ARRAY["dataAgendamento"]
WHERE "dataAgendamento" IS NOT NULL;
ALTER TABLE "item" DROP COLUMN "dataAgendamento";
