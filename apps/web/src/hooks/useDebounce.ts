/**
 * hooks/useDebounce.ts — Espera o usuário parar de digitar
 *
 * Devolve o `valor` só depois de `atraso` milissegundos sem mudanças.
 * Usado na busca da fila: em vez de chamar a API a cada letra digitada,
 * chama uma vez quando a pessoa faz uma pausa.
 *
 * @example
 *   const buscaAtrasada = useDebounce(textoDigitado, 400)
 */

import { useEffect, useState } from 'react'

export function useDebounce<T>(valor: T, atraso = 400): T {
  const [atrasado, setAtrasado] = useState(valor)

  useEffect(() => {
    // Agenda a atualização; se o valor mudar antes, o timer anterior é cancelado
    const timer = setTimeout(() => setAtrasado(valor), atraso)
    return () => clearTimeout(timer)
  }, [valor, atraso])

  return atrasado
}
