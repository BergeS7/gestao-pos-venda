/**
 * lib/navegacao.ts — Para onde ir depois do login (Etapa 9; separado na Etapa 11 para ter teste)
 *
 * Quem abre uma página sem estar logado vai para o login com a página pedida
 * guardada em `location.state.de`. Depois de entrar, o App volta para ela.
 * Só caminhos INTERNOS são aceitos: um endereço externo ("//site.com",
 * "https://...", "/\site.com") cai no Dashboard, para ninguém usar o login
 * do sistema para mandar a pessoa a outro site.
 */

/** Página guardada em `state.de` quando o login foi exigido; senão, o Dashboard. */
export function destinoDepoisDoLogin(state: unknown): string {
  const de = (state as { de?: unknown } | null)?.de
  const interno = typeof de === 'string' && de.startsWith('/') && !de.startsWith('//') && !de.includes('\\')
  return interno ? de : '/dashboard'
}
