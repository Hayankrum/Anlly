-- Agendamento opcional do item: dia (YYYY-MM-DD) + hora (HH:mm),
-- escolhidos no formulário (calendário clicável + campo de horário).
ALTER TABLE "item" ADD COLUMN "dataAgendamento" TEXT,
ADD COLUMN "horaAgendamento" TEXT;
