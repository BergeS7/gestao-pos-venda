/**
 * lib/lib.test.ts — Testes das funções de apoio da tela (Etapa 11)
 *
 *  - permissoes: o que cada perfil vê (precisa espelhar a API);
 *  - senhas: regra de senha e senha provisória;
 *  - navegacao: depois do login, só volta para páginas internas;
 *  - formatar: números, datas e celular no padrão brasileiro.
 *
 * Rodar (na pasta apps/web): npm run test
 */

import { describe, expect, it } from 'vitest'
import type { Perfil, UsuarioLogado } from './api.ts'
import {
  celularBR,
  celularWhatsApp,
  diaBR,
  diaPorExtenso,
  diasAtras,
  kmBR,
  mesPorExtenso,
  plural,
  porcentagem,
} from './formatar.ts'
import { destinoDepoisDoLogin } from './navegacao.ts'
import { pode, type Permissao } from './permissoes.ts'
import { gerarSenhaProvisoria, problemaDaSenha } from './senhas.ts'

const usuario = (perfil: Perfil) => ({ id: 1, nome: 'Teste', perfil }) as UsuarioLogado

describe('permissões por perfil', () => {
  /** Mesma tabela do cabeçalho de lib/permissoes.ts e das rotas da API. */
  const esperado: Record<Permissao, Perfil[]> = {
    atender: ['OPERADORA', 'GESTOR', 'ADMIN'],
    gerirFila: ['GESTOR', 'ADMIN'],
    importar: ['GESTOR', 'ADMIN'],
    usuarios: ['ADMIN'],
    privacidade: ['ADMIN'],
    verTodasCarteiras: ['GESTOR', 'DIRETORIA', 'ADMIN'],
  }
  const perfis: Perfil[] = ['OPERADORA', 'GESTOR', 'DIRETORIA', 'ADMIN']

  it.each(Object.entries(esperado))('%s', (permissao, quem) => {
    for (const p of perfis) expect(pode(usuario(p), permissao as Permissao)).toBe(quem.includes(p))
  })

  it('sem usuário não pode nada', () => {
    expect(pode(null, 'atender')).toBe(false)
  })
})

describe('senhas', () => {
  it('explica o que falta', () => {
    expect(problemaDaSenha('abc1234')).toMatch(/8 caracteres/)
    expect(problemaDaSenha('abcdefgh')).toMatch(/número/)
    expect(problemaDaSenha('12345678')).toMatch(/letra/)
    expect(problemaDaSenha('abc12345')).toBeUndefined()
  })

  it('senha provisória sempre passa na regra e não repete', () => {
    const geradas = new Set(Array.from({ length: 50 }, gerarSenhaProvisoria))
    expect(geradas.size).toBe(50)
    for (const s of geradas) {
      expect(problemaDaSenha(s)).toBeUndefined()
      expect(s).not.toMatch(/[01OlI]/) // sem caracteres que se confundem ao ditar
    }
  })
})

describe('destino depois do login', () => {
  it('volta para a página interna pedida', () => {
    expect(destinoDepoisDoLogin({ de: '/revisoes?unidade=STI' })).toBe('/revisoes?unidade=STI')
  })

  it('endereços externos ou estranhos vão para o Dashboard', () => {
    for (const de of ['//site.com', 'https://site.com', '/\\site.com', 'revisoes', 42, undefined]) {
      expect(destinoDepoisDoLogin({ de })).toBe('/dashboard')
    }
    expect(destinoDepoisDoLogin(null)).toBe('/dashboard')
  })
})

describe('formatar', () => {
  it('porcentagem com 1 casa e traço quando não há valor', () => {
    expect(porcentagem(0.256)).toBe('25,6%')
    expect(porcentagem(1)).toBe('100,0%')
    expect(porcentagem(null)).toBe('—')
  })

  it('mês por extenso', () => {
    expect(mesPorExtenso('2026-10')).toBe('outubro de 2026')
  })

  it('data só dia não volta um dia pelo fuso', () => {
    expect(diaBR('2026-11-16T00:00:00.000Z')).toBe('16/11/2026')
  })

  it('celular', () => {
    expect(celularBR('98900000001')).toBe('(98) 90000-0001')
    expect(celularBR('9830000001')).toBe('(98) 3000-0001')
    expect(celularWhatsApp('(98) 90000-0001')).toBe('5598900000001')
    expect(celularWhatsApp('123')).toBeUndefined()
  })

  it('dias de atraso (Agenda do dia) e dia por extenso', () => {
    expect(diasAtras('2026-11-14', '2026-11-16')).toBe(2)
    expect(diasAtras('2026-11-16T00:00:00.000Z', '2026-11-16')).toBe(0)
    expect(diasAtras('2026-11-20', '2026-11-16')).toBe(-4)
    expect(diasAtras('2026-02-28', '2026-03-01')).toBe(1)
    expect(diaPorExtenso('2026-11-16')).toBe('segunda-feira, 16 de novembro')
  })

  it('plural e km', () => {
    expect(plural(1, 'revisão', 'revisões')).toBe('1 revisão')
    expect(plural(1200, 'revisão', 'revisões')).toBe('1.200 revisões')
    expect(kmBR(12000)).toBe('12.000 km')
  })
})
