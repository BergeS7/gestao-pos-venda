-- Etapa 9 — Login e auditoria
-- Gerada com `prisma migrate diff` (ver docs/arquitetura.md).
--  - usuarios: trocar_senha (Admin definiu a senha → trocar no próximo login) e ultimo_acesso;
--  - auditoria: registro de quem alterou o quê e quando (só inserções).
-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "trocar_senha" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ultimo_acesso" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER,
    "acao" VARCHAR(40) NOT NULL,
    "entidade" VARCHAR(40) NOT NULL,
    "entidade_id" INTEGER,
    "detalhes" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auditoria_criado_em_idx" ON "auditoria"("criado_em");

-- CreateIndex
CREATE INDEX "auditoria_entidade_entidade_id_idx" ON "auditoria"("entidade", "entidade_id");

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

