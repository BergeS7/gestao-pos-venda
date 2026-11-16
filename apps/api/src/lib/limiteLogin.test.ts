/**
 * lib/limiteLogin.test.ts — Bloqueio depois de muitas senhas erradas (Etapa 11)
 *
 * O relógio é passado nos parâmetros (`agora`), então dá para testar os
 * 15 minutos sem esperar de verdade.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  BLOQUEIO_MIN,
  limparFalhas,
  MAX_FALHAS,
  minutosBloqueado,
  registrarFalha,
  zerarLimites,
} from "./limiteLogin.js";

const EMAIL = "operadora@exemplo.local";
const IP = "10.0.0.1";
const T0 = Date.UTC(2026, 10, 16, 12, 0);
const MIN = 60_000;

beforeEach(() => zerarLimites());

describe("limite de tentativas de login", () => {
  it("libera até a quinta falha e bloqueia por 15 minutos depois dela", () => {
    for (let i = 0; i < MAX_FALHAS - 1; i++) registrarFalha(EMAIL, IP, T0);
    expect(minutosBloqueado(EMAIL, IP, T0)).toBe(0);
    registrarFalha(EMAIL, IP, T0);
    expect(minutosBloqueado(EMAIL, IP, T0)).toBe(BLOQUEIO_MIN);
  });

  it("libera sozinho quando o bloqueio vence", () => {
    for (let i = 0; i < MAX_FALHAS; i++) registrarFalha(EMAIL, IP, T0);
    expect(minutosBloqueado(EMAIL, IP, T0 + 10 * MIN)).toBe(5);
    expect(minutosBloqueado(EMAIL, IP, T0 + BLOQUEIO_MIN * MIN + 1)).toBe(0);
  });

  it("login certo zera os erros do e-mail", () => {
    for (let i = 0; i < MAX_FALHAS - 1; i++) registrarFalha(EMAIL, IP, T0);
    limparFalhas(EMAIL);
    registrarFalha(EMAIL, IP, T0);
    expect(minutosBloqueado(EMAIL, IP, T0)).toBe(0);
  });

  it("os erros de um e-mail não bloqueiam outro e-mail do mesmo IP (até o limite do IP)", () => {
    for (let i = 0; i < MAX_FALHAS; i++) registrarFalha(EMAIL, IP, T0);
    expect(minutosBloqueado("gestor@exemplo.local", IP, T0)).toBe(0);
  });
});
