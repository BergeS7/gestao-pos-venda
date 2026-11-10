-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('OPERADORA', 'GESTOR', 'DIRETORIA', 'ADMIN');

-- CreateEnum
CREATE TYPE "TipoImportacao" AS ENUM ('REVISOES', 'ESPELHAMENTO');

-- CreateEnum
CREATE TYPE "StatusImportacao" AS ENUM ('PREVIA', 'CONFIRMADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "SituacaoRevisao" AS ENUM ('PENDENTE', 'RETORNAR', 'AGENDADO', 'NAO_AGENDADO', 'BUSCAR_CONTATO', 'CONCLUIDA');

-- CreateTable
CREATE TABLE "unidades" (
    "id" SERIAL NOT NULL,
    "sigla" VARCHAR(10) NOT NULL,
    "nome" VARCHAR(100) NOT NULL,

    CONSTRAINT "unidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "email" VARCHAR(160) NOT NULL,
    "senha_hash" TEXT,
    "perfil" "Perfil" NOT NULL DEFAULT 'OPERADORA',
    "unidade_id" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motivos" (
    "id" SERIAL NOT NULL,
    "descricao" VARCHAR(120) NOT NULL,
    "encerra_cliente" BOOLEAN NOT NULL DEFAULT true,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "motivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "importacoes" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoImportacao" NOT NULL,
    "arquivo" VARCHAR(255) NOT NULL,
    "periodo_ref" VARCHAR(20),
    "total_linhas" INTEGER NOT NULL DEFAULT 0,
    "total_validos" INTEGER NOT NULL DEFAULT 0,
    "total_invalidos" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusImportacao" NOT NULL DEFAULT 'PREVIA',
    "usuario_id" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "importacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(160) NOT NULL,
    "cpf_cnpj" VARCHAR(14),
    "celular" VARCHAR(15),
    "municipio" VARCHAR(100),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veiculos" (
    "id" SERIAL NOT NULL,
    "chassi" CHAR(17) NOT NULL,
    "modelo" VARCHAR(80) NOT NULL,
    "cor" VARCHAR(60),
    "data_venda" TIMESTAMP(3),
    "cliente_id" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "veiculos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordens_servico" (
    "id" SERIAL NOT NULL,
    "chassi" CHAR(17) NOT NULL,
    "tipo_os" VARCHAR(80) NOT NULL,
    "codigo_assistencia" VARCHAR(20),
    "importacao_id" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ordens_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revisoes_alvo" (
    "id" SERIAL NOT NULL,
    "veiculo_id" INTEGER NOT NULL,
    "km" INTEGER NOT NULL,
    "situacao" "SituacaoRevisao" NOT NULL DEFAULT 'PENDENTE',
    "unidade_id" INTEGER,
    "operador_id" INTEGER,
    "importacao_id" INTEGER,
    "data_agendada" TIMESTAMP(3),
    "proximo_contato" TIMESTAMP(3),
    "concluida" BOOLEAN NOT NULL DEFAULT false,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revisoes_alvo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "unidades_sigla_key" ON "unidades"("sigla");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "motivos_descricao_key" ON "motivos"("descricao");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_cpf_cnpj_key" ON "clientes"("cpf_cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "veiculos_chassi_key" ON "veiculos"("chassi");

-- CreateIndex
CREATE INDEX "ordens_servico_chassi_idx" ON "ordens_servico"("chassi");

-- CreateIndex
CREATE INDEX "revisoes_alvo_situacao_idx" ON "revisoes_alvo"("situacao");

-- CreateIndex
CREATE INDEX "revisoes_alvo_operador_id_idx" ON "revisoes_alvo"("operador_id");

-- CreateIndex
CREATE INDEX "revisoes_alvo_unidade_id_idx" ON "revisoes_alvo"("unidade_id");

-- CreateIndex
CREATE UNIQUE INDEX "revisoes_alvo_veiculo_id_km_key" ON "revisoes_alvo"("veiculo_id", "km");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "unidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacoes" ADD CONSTRAINT "importacoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veiculos" ADD CONSTRAINT "veiculos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_importacao_id_fkey" FOREIGN KEY ("importacao_id") REFERENCES "importacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revisoes_alvo" ADD CONSTRAINT "revisoes_alvo_veiculo_id_fkey" FOREIGN KEY ("veiculo_id") REFERENCES "veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revisoes_alvo" ADD CONSTRAINT "revisoes_alvo_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "unidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revisoes_alvo" ADD CONSTRAINT "revisoes_alvo_operador_id_fkey" FOREIGN KEY ("operador_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revisoes_alvo" ADD CONSTRAINT "revisoes_alvo_importacao_id_fkey" FOREIGN KEY ("importacao_id") REFERENCES "importacoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
