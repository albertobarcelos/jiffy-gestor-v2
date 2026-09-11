/** Política: limite de endereços por cliente delivery (alinhado ao backend). */

export const MAX_ENDERECOS_CLIENTE_DELIVERY = 5

export const MSG_MAX_ENDERECOS_CLIENTE_DELIVERY =
  'Você já atingiu o máximo de 5 endereços cadastrados. Remova um endereço ou escolha um existente.'

export function clienteAtingiuMaxEnderecosDelivery(quantidade: number): boolean {
  return quantidade >= MAX_ENDERECOS_CLIENTE_DELIVERY
}
