-- Quadro Kanban embutido no projeto: cartão é um item filho apontando pro
-- projeto dono (null em itens normais e no próprio projeto).
ALTER TABLE "item" ADD COLUMN "parentId" TEXT;

-- Índice para o cliente/pull listar os cartões de um projeto.
CREATE INDEX "item_parentId_idx" ON "item"("parentId");
