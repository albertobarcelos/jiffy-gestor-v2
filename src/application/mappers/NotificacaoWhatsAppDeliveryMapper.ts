import {
  configuracaoNotificacaoWhatsAppValidator,
  TIPOS_NOTIFICACAO_WHATSAPP_DELIVERY,
  type ConfiguracaoNotificacaoWhatsAppDTO,
  type TipoNotificacaoWhatsAppDelivery,
} from '@/src/application/dto/delivery/NotificacaoWhatsAppDeliveryDTO'

function normalizarItem(raw: unknown): ConfiguracaoNotificacaoWhatsAppDTO | null {
  const parsed = configuracaoNotificacaoWhatsAppValidator.safeParse(raw)
  return parsed.success ? parsed.data : null
}

export function normalizarListaNotificacoesWhatsApp(
  payload: unknown
): ConfiguracaoNotificacaoWhatsAppDTO[] {
  let items: unknown[] = []
  if (Array.isArray(payload)) {
    items = payload
  } else if (payload && typeof payload === 'object') {
    const o = payload as Record<string, unknown>
    if (Array.isArray(o.items)) items = o.items
    else if (Array.isArray(o.data)) items = o.data
  }

  const porTipo = new Map<TipoNotificacaoWhatsAppDelivery, ConfiguracaoNotificacaoWhatsAppDTO>()
  for (const item of items) {
    const normalizado = normalizarItem(item)
    if (normalizado) porTipo.set(normalizado.tipoNotificacao, normalizado)
  }

  return TIPOS_NOTIFICACAO_WHATSAPP_DELIVERY.map(
    tipo =>
      porTipo.get(tipo) ?? {
        tipoNotificacao: tipo,
        ativo: true,
        persistido: false,
      }
  )
}

export function normalizarNotificacaoWhatsApp(
  payload: unknown
): ConfiguracaoNotificacaoWhatsAppDTO | null {
  return normalizarItem(payload)
}

export function contarNotificacoesWhatsAppAtivas(
  lista: ConfiguracaoNotificacaoWhatsAppDTO[]
): number {
  return lista.filter(item => item.ativo).length
}
