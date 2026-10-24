import { describe, expect, it } from 'vitest'
import { avaliarPedidoParaRodada } from '@/src/application/expedicao/avaliarPedidoParaRodada'

describe('avaliarPedidoParaRodada', () => {
  it('aceita pedido pronto', () => {
    expect(avaliarPedidoParaRodada({ etapa: 'PRONTO', entregadorId: null, entregadorNome: null }, 'e1')).toEqual({
      ok: true,
    })
  })

  it('aceita o que ainda está na cozinha para despachar agora', () => {
    expect(
      avaliarPedidoParaRodada({ etapa: 'EM_PREPARO', entregadorId: null, entregadorNome: null }, 'e1')
    ).toEqual({ ok: true })
    expect(
      avaliarPedidoParaRodada({ etapa: 'PENDENTE', entregadorId: null, entregadorNome: null }, 'e1')
    ).toEqual({ ok: true })
  })

  it('bloqueia quem já saiu com outro entregador', () => {
    expect(
      avaliarPedidoParaRodada(
        { etapa: 'EM_ROTA', entregadorId: 'outro', entregadorNome: 'João' },
        'e1'
      )
    ).toEqual({ ok: false, motivo: 'Já saiu com João.' })
  })
})
