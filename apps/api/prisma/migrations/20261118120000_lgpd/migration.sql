-- LGPD: marca de cliente anonimizado (dados pessoais apagados a pedido ou por prazo de guarda)
ALTER TABLE "clientes" ADD COLUMN "anonimizado_em" TIMESTAMP(3);
