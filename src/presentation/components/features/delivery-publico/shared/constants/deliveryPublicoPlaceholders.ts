/**
 * Placeholders do cardápio público até existirem horários/frete reais na API.
 * Não enviar ao backend como valor definitivo.
 */
export const DELIVERY_PUBLICO_HORARIO_PLACEHOLDER = '09:00 às 23:30'

/** Taxa exibida só na UI de tipo de entrega; não entra no payload do pedido. */
export const DELIVERY_PUBLICO_TAXA_ENTREGA_PLACEHOLDER = 5.9

/** Celular BR completo (DDD + 9 dígitos) — alinhado ao backend. */
export const DELIVERY_CELULAR_BR_DIGITOS = 11

/**
 * Mensagem padrão quando o cliente tenta consultar/continuar com menos de 11 dígitos.
 * Neutra: vale tanto para quem já tem cadastro quanto para quem vai se identificar agora.
 */
export const DELIVERY_MSG_CELULAR_COMPLETO =
  'Para continuar, digite o celular completo com DDD — são 11 dígitos.'
