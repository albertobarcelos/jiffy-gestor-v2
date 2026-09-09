import { z } from 'zod'

export const TIPOS_NOTIFICACAO_WHATSAPP_DELIVERY = [
  'delivery.pedido.criado',
  'delivery.pedido.em-preparo',
  'delivery.pedido.pronto',
  'delivery.pedido.em-rota',
  'delivery.pedido.finalizado',
  'delivery.pedido.cancelado',
] as const

export type TipoNotificacaoWhatsAppDelivery =
  (typeof TIPOS_NOTIFICACAO_WHATSAPP_DELIVERY)[number]

export const tipoNotificacaoWhatsAppDeliveryValidator = z.enum(
  TIPOS_NOTIFICACAO_WHATSAPP_DELIVERY
)

export const configuracaoNotificacaoWhatsAppValidator = z.object({
  tipoNotificacao: tipoNotificacaoWhatsAppDeliveryValidator,
  ativo: z.boolean(),
  persistido: z.boolean(),
  id: z.string().optional(),
  dataCriacao: z.string().optional(),
  dataAtualizacao: z.string().optional(),
})

export type ConfiguracaoNotificacaoWhatsAppDTO = z.infer<
  typeof configuracaoNotificacaoWhatsAppValidator
>

export const upsertNotificacaoWhatsAppInputValidator = z.object({
  ativo: z.boolean(),
})

export type UpsertNotificacaoWhatsAppInput = z.infer<
  typeof upsertNotificacaoWhatsAppInputValidator
>

export const LABEL_NOTIFICACAO_WHATSAPP: Record<TipoNotificacaoWhatsAppDelivery, string> = {
  'delivery.pedido.criado': 'Pedido criado',
  'delivery.pedido.em-preparo': 'Em preparo',
  'delivery.pedido.pronto': 'Pronto',
  'delivery.pedido.em-rota': 'Saiu para entrega',
  'delivery.pedido.finalizado': 'Finalizado',
  'delivery.pedido.cancelado': 'Cancelado',
}

export function isTipoNotificacaoWhatsAppDelivery(
  value: string
): value is TipoNotificacaoWhatsAppDelivery {
  return (TIPOS_NOTIFICACAO_WHATSAPP_DELIVERY as readonly string[]).includes(value)
}
