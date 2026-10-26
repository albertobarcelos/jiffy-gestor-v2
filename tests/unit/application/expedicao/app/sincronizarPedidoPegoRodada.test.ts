import { describe, expect, it } from 'vitest'
import {
  etapaAposSincronizarPego,
  listaSuficienteParaCardRodada,
  pedidoJaSincronizadoNaRodada,
} from '@/src/application/expedicao/app/sincronizarPedidoPegoRodada'

describe('pedidoJaSincronizadoNaRodada', () => {
  it('precisa vincular se o pedido está pronto mas ainda não é deste entregador', () => {
    expect(
      pedidoJaSincronizadoNaRodada({ etapa: 'PRONTO', entregadorId: null }, 'e1')
    ).toBe(false)
    expect(
      pedidoJaSincronizadoNaRodada({ etapa: 'PRONTO', entregadorId: 'outro' }, 'e1')
    ).toBe(false)
  })

  it('pula a API se já é deste entregador e está pronto ou em rota', () => {
    expect(
      pedidoJaSincronizadoNaRodada({ etapa: 'PRONTO', entregadorId: 'e1' }, 'e1')
    ).toBe(true)
    expect(
      pedidoJaSincronizadoNaRodada({ etapa: 'EM_ROTA', entregadorId: 'e1' }, 'e1')
    ).toBe(true)
  })

  it('ainda sincroniza se está na cozinha, mesmo com entregador', () => {
    expect(
      pedidoJaSincronizadoNaRodada({ etapa: 'EM_PREPARO', entregadorId: 'e1' }, 'e1')
    ).toBe(false)
  })
})

describe('etapaAposSincronizarPego', () => {
  it('mantém em rota e marca o resto como pronto', () => {
    expect(etapaAposSincronizarPego('EM_ROTA')).toBe('EM_ROTA')
    expect(etapaAposSincronizarPego('EM_PREPARO')).toBe('PRONTO')
    expect(etapaAposSincronizarPego('PENDENTE')).toBe('PRONTO')
  })
})

describe('listaSuficienteParaCardRodada', () => {
  it('só dispensa o detalhe com item e endereço', () => {
    expect(
      listaSuficienteParaCardRodada({
        itens: [{ id: '1', nome: 'Pastel', quantidade: 1 }],
        endereco: 'Rua A, 1 — Centro',
        bairro: 'Centro',
      })
    ).toBe(true)
    expect(
      listaSuficienteParaCardRodada({
        itens: [],
        endereco: 'Rua A',
        bairro: 'Centro',
      })
    ).toBe(false)
    expect(listaSuficienteParaCardRodada(null)).toBe(false)
  })
})
