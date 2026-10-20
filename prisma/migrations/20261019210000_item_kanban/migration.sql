-- Quadro Kanban: coluna fixa do cartão ('afazer' | 'fazendo' | 'feito') e a
-- posição dentro dela (menor = mais ao topo). Null em itens que não são do
-- quadro (tipo 'kanban').
ALTER TABLE "item" ADD COLUMN "coluna" TEXT,
ADD COLUMN "ordem" INTEGER;
