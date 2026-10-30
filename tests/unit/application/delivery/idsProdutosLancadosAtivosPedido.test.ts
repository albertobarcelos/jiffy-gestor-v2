import { describe, expect, it } from 'vitest'
import {
  filtrarIdsLancadosPresentes,
  idsProdutosLancadosAtivosPedido,
} from '@/src/application/delivery/idsProdutosLancadosAtivosPedido'

describe('idsProdutosLancadosAtivosPedido', () => {
  it('lista só itens ativos com id lançado distinto do catálogo', () => {
    const ids = idsProdutosLancadosAtivosPedido({
      produtosLancados: [
        { id: 'lan-1', produtoId: 'cat-1', quantidade: 1 },
        { id: 'lan-2', produtoId: 'cat-2', quantidade: 6, removido: true },
        { id: 'cat-3', produtoId: 'cat-3', quantidade: 1 },
      ],
    })

    expect(ids).toEqual(['lan-1'])
  })

  it('remove do patch só ids que ainda estão no pedido', () => {
    const pedido = {
      produtosLancados: [{ id: 'lan-novo', produtoId: 'cat-1', quantidade: 6 }],
    }

    expect(filtrarIdsLancadosPresentes(['lan-1', 'lan-novo'], pedido)).toEqual(['lan-novo'])
  })
})
