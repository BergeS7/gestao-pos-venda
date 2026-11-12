-- =============================================================================
-- Migração "atendimentos" (Etapa 8)
--
-- 1. Motivos: o campo encerra_cliente (sim/não) vira "acao" (RETORNAR,
--    BUSCAR_CONTATO ou ENCERRAR), para saber para qual situação a revisão vai.
--    Os valores existentes são convertidos antes de apagar a coluna antiga.
-- 2. Datas de agendamento e de próximo contato passam a ser só DATA (sem hora),
--    convertidas no fuso do Maranhão para não mudar de dia.
-- 3. Nova tabela tentativas_contato: o histórico de ligações de cada revisão.
--
-- Gerada com "prisma migrate diff" e ajustada à mão (passos de conversão).
-- =============================================================================

-- CreateEnum
CREATE TYPE "AcaoMotivo" AS ENUM ('RETORNAR', 'BUSCAR_CONTATO', 'ENCERRAR');

-- CreateEnum
CREATE TYPE "ResultadoContato" AS ENUM ('SIM', 'NAO', 'RETORNAR');

-- Motivos: cria a coluna nova, converte os valores e só então apaga a antiga
ALTER TABLE "motivos" ADD COLUMN "acao" "AcaoMotivo" NOT NULL DEFAULT 'ENCERRAR';

UPDATE "motivos" SET "acao" = 'RETORNAR' WHERE "encerra_cliente" = false;
UPDATE "motivos" SET "acao" = 'BUSCAR_CONTATO' WHERE "descricao" ILIKE '%buscar%';

ALTER TABLE "motivos" DROP COLUMN "encerra_cliente";

-- Datas: timestamp (guardado em UTC) → data no fuso America/Fortaleza
ALTER TABLE "revisoes_alvo"
  ALTER COLUMN "data_agendada" SET DATA TYPE DATE
    USING (("data_agendada" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Fortaleza')::date,
  ALTER COLUMN "proximo_contato" SET DATA TYPE DATE
    USING (("proximo_contato" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Fortaleza')::date;

-- CreateTable
CREATE TABLE "tentativas_contato" (
    "id" SERIAL NOT NULL,
    "revisao_id" INTEGER NOT NULL,
    "usuario_id" INTEGER,
    "conseguiu_falar" BOOLEAN NOT NULL,
    "resultado" "ResultadoContato" NOT NULL,
    "motivo_id" INTEGER,
    "data_agendada" DATE,
    "proximo_contato" DATE,
    "observacoes" VARCHAR(1000),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tentativas_contato_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tentativas_contato_revisao_id_criado_em_idx" ON "tentativas_contato"("revisao_id", "criado_em");

-- AddForeignKey
ALTER TABLE "tentativas_contato" ADD CONSTRAINT "tentativas_contato_revisao_id_fkey" FOREIGN KEY ("revisao_id") REFERENCES "revisoes_alvo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tentativas_contato" ADD CONSTRAINT "tentativas_contato_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tentativas_contato" ADD CONSTRAINT "tentativas_contato_motivo_id_fkey" FOREIGN KEY ("motivo_id") REFERENCES "motivos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
