import { describe, expect, it } from 'vitest'
import {
  LABEL_NOTIFICACAO_WHATSAPP,
  TIPOS_NOTIFICACAO_WHATSAPP_DELIVERY,
  isTipoNotificacaoWhatsAppDelivery,
} from '@/src/application/dto/delivery/NotificacaoWhatsAppDeliveryDTO'
import {
  contarNotificacoesWhatsAppAtivas,
  normalizarListaNotificacoesWhatsApp,
  normalizarNotificacaoWhatsApp,
} from '@/src/application/mappers/NotificacaoWhatsAppDeliveryMapper'

describe('NotificacaoWhatsAppDeliveryMapper', () => {
  it('completa os 6 tipos com ativo=true quando a API omite linhas', () => {
    const lista = normalizarListaNotificacoesWhatsApp([
      {
        tipoNotificacao: 'delivery.pedido.cancelado',
        ativo: false,
        persistido: true,
        id: 'n1',
      },
    ])
    expect(lista).toHaveLength(6)
    expect(lista.map(item => item.tipoNotificacao)).toEqual([...TIPOS_NOTIFICACAO_WHATSAPP_DELIVERY])
    expect(lista.find(item => item.tipoNotificacao === 'delivery.pedido.criado')).toEqual({
      tipoNotificacao: 'delivery.pedido.criado',
      ativo: true,
      persistido: false,
    })
    expect(lista.find(item => item.tipoNotificacao === 'delivery.pedido.cancelado')?.ativo).toBe(
      false
    )
    expect(contarNotificacoesWhatsAppAtivas(lista)).toBe(5)
  })

  it('aceita lista envelopada e ignora tipo desconhecido', () => {
    expect(
      normalizarListaNotificacoesWhatsApp({
        items: [
          { tipoNotificacao: 'delivery.pedido.pronto', ativo: true, persistido: false },
          { tipoNotificacao: 'outro.tipo', ativo: false, persistido: true },
        ],
      }).find(item => item.tipoNotificacao === 'delivery.pedido.pronto')?.ativo
    ).toBe(true)
    expect(normalizarNotificacaoWhatsApp({ tipoNotificacao: 'x' })).toBeNull()
  })

  it('expõe labels em português na ordem do pedido', () => {
    expect(LABEL_NOTIFICACAO_WHATSAPP['delivery.pedido.em-rota']).toBe('Saiu para entrega')
    expect(isTipoNotificacaoWhatsAppDelivery('delivery.pedido.criado')).toBe(true)
    expect(isTipoNotificacaoWhatsAppDelivery('delivery.pedido.foo')).toBe(false)
  })
})
