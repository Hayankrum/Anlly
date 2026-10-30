ALTER TABLE "item"
  ADD COLUMN "subitens" JSONB,
  ADD COLUMN "modoTempo" TEXT,
  ADD COLUMN "minutosFoco" INTEGER,
  ADD COLUMN "minutosPausa" INTEGER,
  ADD COLUMN "faseTempo" TEXT,
  ADD COLUMN "ciclosConcluidos" INTEGER;
