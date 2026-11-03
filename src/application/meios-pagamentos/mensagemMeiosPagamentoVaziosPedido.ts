/**
 * Texto de alerta quando o passo de pagamento do Gestor não tem meios
 * disponíveis (balcão = Terminal; delivery = canal do tipo).
 */
export function mensagemMeiosPagamentoVaziosPedido(input: {
  pedidoDeliveryGestor: boolean
  pedidoComRetirada: boolean
}): string {
  if (!input.pedidoDeliveryGestor) {
    return 'Não há nenhum tipo de pagamento ativo no Terminal. Ative ao menos um em Configurações → Meios de pagamento.'
  }
  if (input.pedidoComRetirada) {
    return 'Não há nenhum tipo de pagamento ativo para retirada. Ative ao menos um na coluna Retirada em Configurações → Meios de pagamento.'
  }
  return 'Não há nenhum tipo de pagamento ativo para entrega. Ative ao menos um na coluna Entrega em Configurações → Meios de pagamento.'
}
