-- Variante de conclusão do item + cronômetro.
-- tipo: 'padrao' (segurar p/ concluir) ou 'cronometro'.
-- timerIniciadoEm: sessão em curso (epoch ms, null = parado).
-- tempoDecorridoMs: soma das sessões já encerradas, em milissegundos.
ALTER TABLE "item" ADD COLUMN "tipo" TEXT NOT NULL DEFAULT 'padrao',
ADD COLUMN "timerIniciadoEm" BIGINT,
ADD COLUMN "tempoDecorridoMs" BIGINT;
