import { describe, expect, it } from 'vitest'
import { escolherPedidoPeloCodigo } from '@/src/application/expedicao/mapPedidoLeituraExpedicao'

describe('escolherPedidoPeloCodigo', () => {
  const items = [
    { id: 'a', codigoVenda: 'JTTHYODA', numeroVenda: 12 },
    { id: 'b', codigoVenda: 'POCYXUVK', numeroVenda: 69 },
  ]

  it('acha pelo código da comanda', () => {
    expect(escolherPedidoPeloCodigo(items, 'jtthyoda')).toMatchObject({ id: 'a' })
  })

  it('acha pelo número do pedido', () => {
    expect(escolherPedidoPeloCodigo(items, '69')).toMatchObject({ id: 'b' })
    expect(escolherPedidoPeloCodigo(items, ' 12 ')).toMatchObject({ id: 'a' })
  })

  it('não acha lixo', () => {
    expect(escolherPedidoPeloCodigo(items, '')).toBeNull()
    expect(escolherPedidoPeloCodigo(items, '999')).toBeNull()
  })
})
