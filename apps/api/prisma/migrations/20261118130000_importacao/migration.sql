-- Etapa 6: importação em duas fases (prévia e confirmação)
ALTER TABLE "importacoes" ADD COLUMN "arquivo_espelhamento" VARCHAR(255);
ALTER TABLE "importacoes" ADD COLUMN "resumo" JSONB;
ALTER TABLE "importacoes" ADD COLUMN "previa" JSONB;
ALTER TABLE "importacoes" ADD COLUMN "confirmada_em" TIMESTAMP(3);
