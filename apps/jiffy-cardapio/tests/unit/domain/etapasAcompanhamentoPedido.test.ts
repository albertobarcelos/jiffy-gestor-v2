import { describe, expect, it } from 'vitest'
import { montarEtapasAcompanhamentoPedido } from '@/src/domain/services/pedido/etapasAcompanhamentoPedido'

describe('montarEtapasAcompanhamentoPedido', () => {
  it('entrega tem cinco passos e marca o atual em Pronto', () => {
    const etapas = montarEtapasAcompanhamentoPedido('entrega', 'PRONTO')

    expect(etapas.map(etapa => etapa.rotulo)).toEqual([
      'Pendente',
      'Em preparo',
      'Pronto',
      'Em rota',
      'Finalizado',
    ])
    expect(etapas.map(etapa => etapa.lado)).toEqual([
      'esquerda',
      'direita',
      'esquerda',
      'direita',
      'esquerda',
    ])
    expect(etapas.map(etapa => etapa.estado)).toEqual([
      'feito',
      'feito',
      'atual',
      'futuro',
      'futuro',
    ])
  })

  it('retirada omite Em rota', () => {
    const etapas = montarEtapasAcompanhamentoPedido('retirada', 'PRONTO')

    expect(etapas.map(etapa => etapa.status)).toEqual([
      'PENDENTE',
      'EM_PREPARO',
      'PRONTO',
      'FINALIZADO',
    ])
    expect(etapas.find(etapa => etapa.status === 'PRONTO')?.lado).toBe('esquerda')
    expect(etapas.find(etapa => etapa.status === 'FINALIZADO')?.lado).toBe('direita')
  })

  it('cancelado encerra a lista nesse rótulo', () => {
    const etapas = montarEtapasAcompanhamentoPedido('entrega', 'CANCELADO')

    expect(etapas).toEqual([
      {
        status: 'CANCELADO',
        rotulo: 'Cancelado',
        lado: 'esquerda',
        estado: 'atual',
      },
    ])
  })
})
