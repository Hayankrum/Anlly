-- Configuração específica do quadro em cada projeto Kanban.
ALTER TABLE "item" ADD COLUMN "quadroKanban" JSONB;
