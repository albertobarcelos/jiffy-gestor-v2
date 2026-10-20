import { describe, expect, it } from 'vitest'
import {
  mapRelatorioEntregasDetalhe,
  mapRelatorioEntregasItem,
  mapRelatorioEntregasListagem,
} from '@/src/application/dto/RelatorioEntregasDTO'

describe('RelatorioEntregasDTO', () => {
  it('mapeia item com entregador e totais numéricos', () => {
    const item = mapRelatorioEntregasItem({
      entregador: { id: 'e1', nome: 'João', telefone: '11999999999' },
      countEntregasParticipadas: '3',
      valorTotalEntregasParticipadas: '120.5',
      somaTaxasEntrega: 18,
      tempoMedioEntregaEmSegundos: 540,
    })
    expect(item).toEqual({
      entregador: { id: 'e1', nome: 'João', telefone: '11999999999' },
      countEntregasParticipadas: 3,
      valorTotalEntregasParticipadas: 120.5,
      somaTaxasEntrega: 18,
      tempoMedioEntregaEmSegundos: 540,
    })
  })

  it('ignora item sem entregador', () => {
    expect(mapRelatorioEntregasItem({ somaTaxasEntrega: 10 })).toBeNull()
  })

  it('trata tempo médio nulo', () => {
    const item = mapRelatorioEntregasItem({
      entregador: { id: 'e1', nome: 'Ana' },
      countEntregasParticipadas: 1,
      valorTotalEntregasParticipadas: 20,
      somaTaxasEntrega: 5,
      tempoMedioEntregaEmSegundos: null,
    })
    expect(item?.tempoMedioEntregaEmSegundos).toBeNull()
  })

  it('mapeia listagem paginada', () => {
    const list = mapRelatorioEntregasListagem({
      count: 1,
      hasNext: false,
      items: [
        {
          entregador: { id: 'e1', nome: 'João' },
          countEntregasParticipadas: 2,
          valorTotalEntregasParticipadas: 40,
          somaTaxasEntrega: 8,
          tempoMedioEntregaEmSegundos: 90,
        },
        { somaTaxasEntrega: 1 },
      ],
    })
    expect(list.count).toBe(1)
    expect(list.items).toHaveLength(1)
    expect(list.items?.[0]?.entregador.id).toBe('e1')
  })

  it('mapeia detalhe com vendas do DTO de pedido', () => {
    const detalhe = mapRelatorioEntregasDetalhe({
      entregador: { id: 'e1', nome: 'João' },
      countEntregasParticipadas: 1,
      valorTotalEntregasParticipadas: 40,
      somaTaxasEntrega: 8,
      tempoMedioEntregaEmSegundos: 120,
      vendas: {
        count: 1,
        hasNext: false,
        items: [
          {
            id: 'v1',
            codigoVenda: 'DEL-1',
            numeroVenda: 12,
            valorFinal: '40.00',
            taxaEntrega: 8,
            dataFinalizacao: '2026-09-26T12:00:00.000Z',
            statusDelivery: 'FINALIZADO',
            cliente: { id: 'c1', nome: 'Maria' },
          },
        ],
      },
    })
    expect(detalhe?.vendas.items).toHaveLength(1)
    expect(detalhe?.vendas.items[0]).toMatchObject({
      id: 'v1',
      codigoVenda: 'DEL-1',
      numeroVenda: 12,
      valorFinal: 40,
      taxaEntrega: 8,
      statusDelivery: 'FINALIZADO',
      nomeCliente: 'Maria',
    })
  })
})
