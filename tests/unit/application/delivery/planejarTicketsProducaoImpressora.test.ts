import { describe, expect, it } from 'vitest'
import { planejarTicketsProducaoImpressora } from '@/src/application/delivery/planejarTicketsProducaoImpressora'
import type { VendaGestorTicketItem } from '@/src/shared/types/vendaGestorTickets'

function item(params: {
  lancadoId: string
  produtoId: string
  nome: string
  quantidade: number
  complementos?: VendaGestorTicketItem['complementos']
  observacao?: string
}): VendaGestorTicketItem {
  return {
    produtoLancadoId: params.lancadoId,
    produtoId: params.produtoId,
    nomeProduto: params.nome,
    quantidade: params.quantidade,
    valorUnitario: 10,
    complementos: params.complementos,
    observacao: params.observacao,
  }
}

function comp(id: string, nome: string, impacto = 'aumenta') {
  return {
    complementoId: id,
    nome,
    quantidade: 1,
    tipoImpactoPreco: impacto,
  }
}

describe('planejarTicketsProducaoImpressora', () => {
  describe('Modo Normal', () => {
    it('preserva linhas de lançamento sem agrupar', () => {
      const items = [
        item({ lancadoId: '1', produtoId: 'h', nome: 'Heineken', quantidade: 1 }),
        item({ lancadoId: '2', produtoId: 'h', nome: 'Heineken', quantidade: 1 }),
        item({ lancadoId: '3', produtoId: 'b', nome: 'Brahma', quantidade: 1 }),
        item({ lancadoId: '4', produtoId: 'l', nome: 'Lanches', quantidade: 2 }),
      ]

      const tickets = planejarTicketsProducaoImpressora(items, 'normal')

      expect(tickets).toHaveLength(1)
      expect(tickets[0].kind).toBe('single')
      expect(tickets[0].items.map(e => e.quantidade)).toEqual([1, 1, 1, 2])
    })
  })

  describe('Modo Ficha (delivery)', () => {
    it('trata ficha como normal', () => {
      const items = [
        item({ lancadoId: '1', produtoId: 'h', nome: 'Heineken', quantidade: 1 }),
        item({ lancadoId: '2', produtoId: 'h', nome: 'Heineken', quantidade: 1 }),
      ]
      const tickets = planejarTicketsProducaoImpressora(items, 'ficha')
      expect(tickets).toHaveLength(1)
      expect(tickets[0].kind).toBe('single')
      expect(tickets[0].items.map(e => e.quantidade)).toEqual([1, 1])
    })
  })

  describe('Modo Agrupado', () => {
    it('soma apenas itens totalmente equivalentes', () => {
      const items = [
        item({ lancadoId: '1', produtoId: 'h', nome: 'Heineken', quantidade: 1 }),
        item({ lancadoId: '2', produtoId: 'h', nome: 'Heineken', quantidade: 1 }),
        item({ lancadoId: '3', produtoId: 'b', nome: 'Brahma', quantidade: 1 }),
        item({ lancadoId: '4', produtoId: 'p', nome: 'Pastel Carne', quantidade: 1 }),
        item({ lancadoId: '5', produtoId: 'pf', nome: 'Pastel Frango Catupiry', quantidade: 1 }),
        item({ lancadoId: '6', produtoId: 'p', nome: 'Pastel Carne', quantidade: 2 }),
      ]

      const tickets = planejarTicketsProducaoImpressora(items, 'agrupado')
      const grouped = tickets[0].items

      expect(tickets).toHaveLength(1)
      expect(tickets[0].kind).toBe('single')
      expect(grouped).toHaveLength(4)
      expect(grouped.find(e => e.produtoId === 'h')?.quantidade).toBe(2)
      expect(grouped.find(e => e.produtoId === 'b')?.quantidade).toBe(1)
      expect(grouped.find(e => e.produtoId === 'p')?.quantidade).toBe(3)
      expect(grouped.find(e => e.produtoId === 'pf')?.quantidade).toBe(1)
    })

    it('não agrupa quando observação ou complemento diferem', () => {
      const items = [
        item({
          lancadoId: '1',
          produtoId: 'p',
          nome: 'Pastel Carne',
          quantidade: 1,
          complementos: [comp('q', 'Queijo')],
        }),
        item({ lancadoId: '2', produtoId: 'p', nome: 'Pastel Carne', quantidade: 1 }),
        item({
          lancadoId: '3',
          produtoId: 'p',
          nome: 'Pastel Carne',
          quantidade: 1,
          observacao: 'sem cebola',
        }),
      ]

      const grouped = planejarTicketsProducaoImpressora(items, 'agrupado')[0].items
      expect(grouped).toHaveLength(3)
    })

    it('não agrupa quando o nome do complemento difere mesmo com id vazio', () => {
      const items = [
        item({
          lancadoId: '1',
          produtoId: 'p',
          nome: 'Pastel',
          quantidade: 1,
          complementos: [comp('', 'Carne')],
        }),
        item({
          lancadoId: '2',
          produtoId: 'p',
          nome: 'Pastel',
          quantidade: 1,
          complementos: [comp('', 'Frango Catupiry')],
        }),
      ]

      const grouped = planejarTicketsProducaoImpressora(items, 'agrupado')[0].items
      expect(grouped).toHaveLength(2)
      expect(grouped.map(e => e.complementos?.[0]?.nome)).toEqual(['Carne', 'Frango Catupiry'])
    })

    it('preserva e soma modificadores ao agrupar linhas equivalentes', () => {
      const items = [
        item({
          lancadoId: '1',
          produtoId: 'p',
          nome: 'Pastel Carne',
          quantidade: 1,
          complementos: [comp('q', 'Queijo')],
          observacao: 'sem cebola',
        }),
        item({
          lancadoId: '2',
          produtoId: 'p',
          nome: 'Pastel Carne',
          quantidade: 2,
          complementos: [comp('q', 'Queijo')],
          observacao: 'sem cebola',
        }),
      ]

      const grouped = planejarTicketsProducaoImpressora(items, 'agrupado')[0].items[0]

      expect(grouped.quantidade).toBe(3)
      expect(grouped.complementos).toHaveLength(1)
      expect(grouped.complementos?.[0]?.nome).toBe('Queijo')
      expect(grouped.complementos?.[0]?.quantidade).toBe(2)
      expect(grouped.observacao).toBe('sem cebola')
    })
  })

  describe('Modo Por Unidade', () => {
    it('gera uma via por unidade e conferência quando N > 1', () => {
      const items = [
        item({
          lancadoId: '1',
          produtoId: 'p',
          nome: 'Pastel Carne',
          quantidade: 2,
          complementos: [comp('q', 'Queijo'), comp('m', 'Morango')],
        }),
      ]

      const tickets = planejarTicketsProducaoImpressora(items, 'porUnidade')

      expect(tickets).toHaveLength(3)
      expect(tickets[0].kind).toBe('unit')
      expect(tickets[0].unitIndex).toBe(1)
      expect(tickets[0].unitTotal).toBe(2)
      expect(tickets[0].items[0].quantidade).toBe(1)
      expect(tickets[1].kind).toBe('unit')
      expect(tickets[1].unitIndex).toBe(2)
      expect(tickets[2].kind).toBe('conference')
      expect(tickets[2].items[0].quantidade).toBe(2)
    })

    it('não gera conferência quando há somente uma via', () => {
      const items = [
        item({ lancadoId: '1', produtoId: 'p', nome: 'Pastel Carne', quantidade: 1 }),
      ]

      const tickets = planejarTicketsProducaoImpressora(items, 'porUnidade')

      expect(tickets).toHaveLength(1)
      expect(tickets[0].kind).toBe('unit')
      expect(tickets[0].unitIndex).toBe(1)
      expect(tickets[0].unitTotal).toBe(1)
    })

    it('contagem 1 DE N é local à lista da impressora', () => {
      const items = [
        item({ lancadoId: '1', produtoId: 'p', nome: 'Pastel Carne', quantidade: 3 }),
        item({ lancadoId: '2', produtoId: 'pf', nome: 'Pastel Frango', quantidade: 1 }),
      ]

      const tickets = planejarTicketsProducaoImpressora(items, 'porUnidade')
      const units = tickets.filter(t => t.kind === 'unit')
      const conference = tickets.filter(t => t.kind === 'conference')

      expect(units).toHaveLength(4)
      expect(new Set(units.map(e => e.unitTotal))).toEqual(new Set([4]))
      expect(conference).toHaveLength(1)
      expect(conference[0].items).toHaveLength(2)
    })
  })
})
