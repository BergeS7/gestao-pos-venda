/**
 * lib/limiteLogin.ts — Limite de tentativas de login (Etapa 9)
 *
 * Contra quem tenta adivinhar senhas: depois de MAX_FALHAS erros seguidos do
 * mesmo e-mail (ou do mesmo endereço IP), o login fica bloqueado por
 * BLOQUEIO_MIN minutos. Um login certo zera a contagem daquele e-mail.
 *
 * Os contadores ficam na memória da API: somem se ela reiniciar e não são
 * compartilhados entre vários servidores. Para um único servidor (o caso da
 * concessionária) é suficiente. Com mais servidores, guardar no banco ou no Redis.
 */

/** Erros permitidos antes do bloqueio. */
export const MAX_FALHAS = 5;
/** Duração do bloqueio, em minutos. */
export const BLOQUEIO_MIN = 15;

/** Por IP o limite é maior, porque várias pessoas podem sair pelo mesmo IP da loja. */
const MAX_FALHAS_IP = 30;

type Contador = { falhas: number; ate: number };
const porChave = new Map<string, Contador>();

const JANELA_MS = BLOQUEIO_MIN * 60 * 1000;

function contador(chave: string, agora: number): Contador {
  const c = porChave.get(chave);
  if (!c || c.ate < agora) {
    const novo = { falhas: 0, ate: agora + JANELA_MS };
    porChave.set(chave, novo);
    return novo;
  }
  return c;
}

/**
 * Minutos que faltam para liberar o login (0 = liberado).
 * @param email e-mail digitado (minúsculo)
 * @param ip    endereço de quem está tentando
 */
export function minutosBloqueado(email: string, ip: string, agora = Date.now()): number {
  const e = contador(`e:${email}`, agora);
  const i = contador(`i:${ip}`, agora);
  const bloqueadoAte = Math.max(e.falhas >= MAX_FALHAS ? e.ate : 0, i.falhas >= MAX_FALHAS_IP ? i.ate : 0);
  return bloqueadoAte > agora ? Math.ceil((bloqueadoAte - agora) / 60_000) : 0;
}

/** Conta um erro de senha. O bloqueio dura BLOQUEIO_MIN minutos a partir do último erro. */
export function registrarFalha(email: string, ip: string, agora = Date.now()): void {
  for (const chave of [`e:${email}`, `i:${ip}`]) {
    const c = contador(chave, agora);
    c.falhas += 1;
    c.ate = agora + JANELA_MS;
  }
}

/** Login certo: zera os erros daquele e-mail. */
export function limparFalhas(email: string): void {
  porChave.delete(`e:${email}`);
}

/** Só para testes: apaga todos os contadores. */
export function zerarLimites(): void {
  porChave.clear();
}
