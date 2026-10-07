import { describe, expect, it } from 'vitest'
import {
  horarioInicioEtapa,
  montarEtapasAcompanhamentoPedido,
} from '@/src/domain/services/pedido/etapasAcompanhamentoPedido'

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

  it('usa o último horário quando o status se repete', () => {
    const horario = horarioInicioEtapa(
      [
        { status: 'PENDENTE', realizadaEm: '2026-10-07T14:00:00.000Z' },
        { status: 'EM_PREPARO', realizadaEm: '2026-10-07T14:10:00.000Z' },
        { status: 'EM_PREPARO', realizadaEm: '2026-10-07T15:05:00.000Z' },
      ],
      'EM_PREPARO'
    )

    expect(horario).toBe('2026-10-07T15:05:00.000Z')
    expect(horarioInicioEtapa([], 'PRONTO')).toBeNull()
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
