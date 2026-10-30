CREATE TABLE "modelo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "updatedAt" BIGINT NOT NULL,
    "deletedAt" BIGINT,
    "serverSeq" BIGINT NOT NULL,

    CONSTRAINT "modelo_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "modelo_userId_serverSeq_idx" ON "modelo"("userId", "serverSeq");

ALTER TABLE "modelo" ADD CONSTRAINT "modelo_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
