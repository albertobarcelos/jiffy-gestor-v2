import { describe, expect, it } from 'vitest'
import { escolherEstacaoImpressaoParaCupom } from '@/src/application/expedicao/escolherEstacaoImpressaoParaCupom'
import type { EstacaoImpressaoResumo } from '@/src/domain/estacao-impressao/EstacaoImpressao'

const estacao = (
  id: string,
  extras: Partial<EstacaoImpressaoResumo> = {}
): EstacaoImpressaoResumo => ({
  id,
  nome: id,
  ativo: true,
  gestorDelivery: false,
  ...extras,
})

describe('escolherEstacaoImpressaoParaCupom', () => {
  it('usa só a receptora delivery da loja', () => {
    expect(
      escolherEstacaoImpressaoParaCupom([
        estacao('balcao'),
        estacao('expedicao', { gestorDelivery: true }),
      ])
    ).toBe('expedicao')
  })

  it('ignora estação inativa mesmo se for receptora', () => {
    expect(
      escolherEstacaoImpressaoParaCupom([
        estacao('morta', { gestorDelivery: true, ativo: false }),
        estacao('viva'),
      ])
    ).toBeNull()
  })

  it('devolve null sem receptora — não cai na primeira ativa', () => {
    expect(escolherEstacaoImpressaoParaCupom([estacao('x'), estacao('y')])).toBeNull()
  })

  it('devolve null sem estações', () => {
    expect(escolherEstacaoImpressaoParaCupom([])).toBeNull()
  })
})
