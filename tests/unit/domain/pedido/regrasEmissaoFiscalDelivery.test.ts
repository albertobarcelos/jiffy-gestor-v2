import { describe, expect, it } from 'vitest'
import { ehPedidoModuloDelivery } from '@/src/domain/services/pedido/PedidoModuloDelivery'
import {
  avaliarEmissaoFiscalDelivery,
  MENSAGEM_EMISSAO_DELIVERY_SO_FINALIZADO,
  montarBodyReemitirNotaDelivery,
  numeroOpcionalReemitirNotaDelivery,
  pedidoDeliveryPermiteEmissaoFiscal,
  statusEtapaDeliveryAindaOperacional,
  statusEtapaDeliveryEstaFinalizado,
} from '@/src/domain/services/pedido/RegrasEmissaoFiscalDelivery'

describe('PedidoModuloDelivery', () => {
  it('reconhece só venda_gestor com tipoVenda delivery', () => {
    expect(ehPedidoModuloDelivery('venda_gestor', 'delivery')).toBe(true)
    expect(ehPedidoModuloDelivery('venda_gestor', 'entrega')).toBe(false)
    expect(ehPedidoModuloDelivery('venda_gestor', 'retirada')).toBe(false)
    expect(ehPedidoModuloDelivery('venda_gestor', 'balcao')).toBe(false)
    expect(ehPedidoModuloDelivery('venda', 'delivery')).toBe(false)
  })
})

describe('RegrasEmissaoFiscalDelivery', () => {
  it('reconhece etapa finalizada e operacional', () => {
    expect(statusEtapaDeliveryEstaFinalizado('FINALIZADO')).toBe(true)
    expect(statusEtapaDeliveryEstaFinalizado('entregue')).toBe(true)
    expect(statusEtapaDeliveryEstaFinalizado('NOVOS_PEDIDOS')).toBe(false)
    expect(statusEtapaDeliveryEstaFinalizado('EM_PREPARO')).toBe(false)
    expect(statusEtapaDeliveryAindaOperacional('EM_ROTA')).toBe(true)
    expect(statusEtapaDeliveryAindaOperacional('PRONTO_ENTREGA')).toBe(true)
    expect(statusEtapaDeliveryAindaOperacional('FINALIZADO')).toBe(false)
    expect(statusEtapaDeliveryAindaOperacional('COZINHA')).toBe(false)
  })

  it('não restringe venda que não é delivery gestor', () => {
    expect(
      avaliarEmissaoFiscalDelivery({
        tabelaOrigem: 'venda',
        tipoVenda: 'pdv',
        statusEtapaOperacional: 'ABERTA',
      })
    ).toBe('liberado')
    expect(
      pedidoDeliveryPermiteEmissaoFiscal({
        tabelaOrigem: 'venda_gestor',
        tipoVenda: 'balcao',
        statusEtapaOperacional: 'ABERTA',
      })
    ).toBe(true)
  })

  it('bloqueia emissão nas etapas operacionais do delivery', () => {
    expect(
      avaliarEmissaoFiscalDelivery({
        tabelaOrigem: 'venda_gestor',
        tipoVenda: 'delivery',
        statusEtapaOperacional: 'EM_PREPARO',
      })
    ).toBe('bloqueado')
    expect(
      avaliarEmissaoFiscalDelivery({
        tabelaOrigem: 'venda_gestor',
        tipoVenda: 'delivery',
        statusEtapaOperacional: 'EM_ROTA',
      })
    ).toBe('bloqueado')
  })

  it('libera emissão só depois de finalizado', () => {
    expect(
      pedidoDeliveryPermiteEmissaoFiscal({
        tabelaOrigem: 'venda_gestor',
        tipoVenda: 'delivery',
        statusEtapaOperacional: 'FINALIZADO',
      })
    ).toBe(true)
  })

  it('fica indeterminado quando a etapa operacional não veio', () => {
    expect(
      avaliarEmissaoFiscalDelivery({
        tabelaOrigem: 'venda_gestor',
        tipoVenda: 'delivery',
        statusEtapaOperacional: null,
      })
    ).toBe('indeterminado')
    expect(
      avaliarEmissaoFiscalDelivery({
        tabelaOrigem: 'venda_gestor',
        tipoVenda: 'delivery',
        statusEtapaOperacional: 'COZINHA',
      })
    ).toBe('indeterminado')
  })

  it('bloqueia coluna operacional do Kanban após normalizar para a etapa canônica', () => {
    expect(
      avaliarEmissaoFiscalDelivery({
        tabelaOrigem: 'venda_gestor',
        tipoVenda: 'delivery',
        statusEtapaOperacional: 'NOVOS_PEDIDOS',
      })
    ).toBe('bloqueado')
  })

  it('bloqueia pedido delivery cancelado', () => {
    expect(
      pedidoDeliveryPermiteEmissaoFiscal({
        tabelaOrigem: 'venda_gestor',
        tipoVenda: 'delivery',
        statusEtapaOperacional: 'FINALIZADO',
        cancelado: true,
      })
    ).toBe(false)
  })

  it('monta body de reemissão só com numero opcional', () => {
    expect(montarBodyReemitirNotaDelivery({})).toEqual({})
    expect(montarBodyReemitirNotaDelivery({ numero: 12 })).toEqual({ numero: 12 })
    expect(numeroOpcionalReemitirNotaDelivery(0)).toBeUndefined()
    expect(MENSAGEM_EMISSAO_DELIVERY_SO_FINALIZADO).toContain('finalizado')
  })
})
