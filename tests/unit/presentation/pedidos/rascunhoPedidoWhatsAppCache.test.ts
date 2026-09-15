import { describe, expect, it, beforeEach } from 'vitest'
import {
  criarRascunhoPedidoWhatsAppVazio,
  limparRascunhoPedidoWhatsApp,
  limparTodosRascunhosPedidoWhatsApp,
  obterRascunhoPedidoWhatsApp,
  rascunhoPedidoWhatsAppTemItens,
  salvarRascunhoPedidoWhatsApp,
  type RascunhoPedidoWhatsApp,
} from '@/src/presentation/components/features/pedidos/rascunho/rascunhoPedidoWhatsAppCache'

function rascunhoBase(
  extra: Partial<RascunhoPedidoWhatsApp> = {}
): RascunhoPedidoWhatsApp {
  return {
    ...criarRascunhoPedidoWhatsAppVazio(),
    ...extra,
  }
}

describe('rascunhoPedidoWhatsAppCache', () => {
  beforeEach(() => {
    limparTodosRascunhosPedidoWhatsApp()
  })

  it('nao persiste rascunho vazio', () => {
    salvarRascunhoPedidoWhatsApp('conv-1', rascunhoBase())
    expect(obterRascunhoPedidoWhatsApp('conv-1')).toBeNull()
    expect(rascunhoPedidoWhatsAppTemItens(rascunhoBase())).toBe(false)
  })

  it('guarda e devolve uma copia dos produtos lancados', () => {
    const produtos = [
      {
        produtoId: 'p1',
        nome: 'X-Burger',
        quantidade: 1,
        valorUnitario: 22,
        complementos: [],
      },
    ]
    salvarRascunhoPedidoWhatsApp('conv-1', rascunhoBase({ produtos }))
    const lido = obterRascunhoPedidoWhatsApp('conv-1')
    expect(lido?.produtos).toEqual(produtos)
    produtos[0]!.nome = 'alterado'
    expect(lido?.produtos[0]?.nome).toBe('X-Burger')
  })

  it('limpa o rascunho da conversa apos o pedido ser criado', () => {
    salvarRascunhoPedidoWhatsApp(
      'conv-1',
      rascunhoBase({
        produtos: [
          {
            produtoId: 'p1',
            nome: 'X-Burger',
            quantidade: 1,
            valorUnitario: 22,
            complementos: [],
          },
        ],
      })
    )
    limparRascunhoPedidoWhatsApp('conv-1')
    expect(obterRascunhoPedidoWhatsApp('conv-1')).toBeNull()
  })
})
