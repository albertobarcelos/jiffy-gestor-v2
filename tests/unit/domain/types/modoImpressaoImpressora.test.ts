import { describe, expect, it } from 'vitest'
import { Impressora } from '@/src/domain/entities/Impressora'
import {
  modosImpressaoPorImpressoraIdDeMapeamentos,
  parseModoImpressaoImpressora,
  resolverModoImpressaoDaEstacao,
} from '@/src/domain/types/modoImpressaoImpressora'

describe('parseModoImpressaoImpressora', () => {
  it('reconhece os 4 modos', () => {
    expect(parseModoImpressaoImpressora('normal')).toBe('normal')
    expect(parseModoImpressaoImpressora('agrupado')).toBe('agrupado')
    expect(parseModoImpressaoImpressora('porUnidade')).toBe('porUnidade')
    expect(parseModoImpressaoImpressora('ficha')).toBe('ficha')
  })

  it('modoFicha true vira ficha quando modoImpressao está vazio', () => {
    expect(parseModoImpressaoImpressora(undefined, true)).toBe('ficha')
    expect(parseModoImpressaoImpressora('', false)).toBe('normal')
  })

  it('valor desconhecido cai em normal', () => {
    expect(parseModoImpressaoImpressora('A4')).toBe('normal')
  })
})

describe('resolverModoImpressaoDaEstacao', () => {
  it('usa só o modo desta estação nesta impressora', () => {
    expect(
      resolverModoImpressaoDaEstacao(
        [
          { terminalId: 'est-caixa', ativo: true, modoImpressao: 'agrupado' },
          { terminalId: 'est-bar', ativo: true, modoImpressao: 'porUnidade' },
        ],
        'est-bar'
      )
    ).toBe('porUnidade')
  })

  it('aceita estacaoId como chave da config', () => {
    expect(
      resolverModoImpressaoDaEstacao(
        [{ estacaoId: 'est-1', ativo: true, modoImpressao: 'ficha' }],
        'est-1'
      )
    ).toBe('ficha')
  })

  it('sem o par estação+impressora retorna normal — não infere de outras estações', () => {
    expect(
      resolverModoImpressaoDaEstacao(
        [
          { terminalId: 't1', ativo: true, modoImpressao: 'agrupado' },
          { terminalId: 't2', ativo: true, modoImpressao: 'agrupado' },
        ],
        'est-inexistente'
      )
    ).toBe('normal')
  })

  it('sem estação retorna normal', () => {
    expect(
      resolverModoImpressaoDaEstacao(
        [{ terminalId: 't1', ativo: true, modoImpressao: 'agrupado' }],
        null
      )
    ).toBe('normal')
  })
})

describe('modosImpressaoPorImpressoraIdDeMapeamentos', () => {
  it('lê modoImpressao da estação e ignora mapeamento sem o campo', () => {
    expect(
      modosImpressaoPorImpressoraIdDeMapeamentos([
        { impressoraId: 'imp-1', modoImpressao: 'agrupado' },
        { impressoraId: 'imp-2' },
        { impressoraId: 'imp-3', modo_impressao: 'porUnidade' },
      ])
    ).toEqual({
      'imp-1': 'agrupado',
      'imp-3': 'porUnidade',
    })
  })
})

describe('Impressora.fromJSON modoImpressao', () => {
  it('propaga modoImpressao e modoFicha derivado por estação', () => {
    const impressora = Impressora.fromJSON({
      id: 'imp-1',
      nome: 'Cozinha',
      ativo: true,
      terminaisConfig: [
        { terminalId: 't1', ativo: true, modoImpressao: 'agrupado', modoFicha: false },
        { terminalId: 't2', ativo: true, modoImpressao: 'agrupado' },
      ],
    })

    expect(impressora.getTerminais()?.map(t => t.modoImpressao)).toEqual(['agrupado', 'agrupado'])
    expect(impressora.getTerminais()?.every(t => t.modoFicha === false)).toBe(true)
    expect(impressora.getModoImpressaoDaEstacao('t1')).toBe('agrupado')
    expect(impressora.getModoImpressaoDaEstacao('t2')).toBe('agrupado')
  })

  it('modoFicha legado sem modoImpressao vira ficha naquela estação', () => {
    const impressora = Impressora.fromJSON({
      id: 'imp-1',
      nome: 'Cozinha',
      terminaisConfig: [{ terminalId: 't1', ativo: true, modoFicha: true }],
    })
    expect(impressora.getModoImpressaoDaEstacao('t1')).toBe('ficha')
  })

  it('getModoImpressaoDaEstacao não mistura modos de outras estações', () => {
    const impressora = Impressora.fromJSON({
      id: 'imp-1',
      nome: 'Cozinha',
      terminaisConfig: [
        { terminalId: 'est-caixa', ativo: true, modoImpressao: 'agrupado' },
        { estacaoId: 'est-gestor', ativo: true, modoImpressao: 'porUnidade' },
      ],
    })
    expect(impressora.getModoImpressaoDaEstacao('est-gestor')).toBe('porUnidade')
    expect(impressora.getModoImpressaoDaEstacao('est-caixa')).toBe('agrupado')
    expect(impressora.getModoImpressaoDaEstacao('outra')).toBe('normal')
  })
})
