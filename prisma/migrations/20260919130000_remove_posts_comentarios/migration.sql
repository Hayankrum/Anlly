-- DropForeignKey
ALTER TABLE "Comentario" DROP CONSTRAINT "Comentario_postId_fkey";

-- DropForeignKey
ALTER TABLE "Comentario" DROP CONSTRAINT "Comentario_autorId_fkey";

-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_autorId_fkey";

-- DropTable
DROP TABLE "Comentario";

-- DropTable
DROP TABLE "Post";

-- AlterTable
ALTER TABLE "Usuario" DROP COLUMN "notificarComentarios";
