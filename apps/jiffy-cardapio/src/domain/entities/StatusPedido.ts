/**
 * Enum representando os status possíveis de um pedido de delivery
 */
export enum StatusPedido {
  CANCELADO = 0,
  PENDENTE = 1,
  EM_PRODUCAO = 2,
  PRONTO = 3,
  FINALIZADO = 4,
  AGENDAMENTO_ACEITO = 5,
}

/**
 * Labels descritivos para cada status
 */
export const StatusPedidoLabels: Record<StatusPedido, string> = {
  [StatusPedido.CANCELADO]: 'Pedido cancelado',
  [StatusPedido.PENDENTE]: 'Pedido pendente',
  [StatusPedido.EM_PRODUCAO]: 'Pedido em produção',
  [StatusPedido.PRONTO]: 'Pedido em trânsito ou pronto para retirada',
  [StatusPedido.FINALIZADO]: 'Pedido entregue ou retirado',
  [StatusPedido.AGENDAMENTO_ACEITO]: 'Pedido aceito (Em caso de agendamento)',
}

/**
 * Retorna o próximo status válido a partir do status atual
 */
export function getProximoStatus(statusAtual: StatusPedido): StatusPedido | null {
  switch (statusAtual) {
    case StatusPedido.PENDENTE:
      // Se for agendamento, o próximo é AGENDAMENTO_ACEITO
      // Caso contrário, é EM_PRODUCAO
      // Por enquanto, assumimos fluxo normal
      return StatusPedido.EM_PRODUCAO
    case StatusPedido.AGENDAMENTO_ACEITO:
      return StatusPedido.EM_PRODUCAO
    case StatusPedido.EM_PRODUCAO:
      return StatusPedido.PRONTO
    case StatusPedido.PRONTO:
      return StatusPedido.FINALIZADO
    case StatusPedido.FINALIZADO:
    case StatusPedido.CANCELADO:
      return null // Não há próximo status
    default:
      return null
  }
}

