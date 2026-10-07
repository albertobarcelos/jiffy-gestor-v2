import type { DeliveryTipoEntrega } from '@/src/domain/types/entrega'

export type StatusAcompanhamentoPedido =
  | 'PENDENTE'
  | 'EM_PREPARO'
  | 'PRONTO'
  | 'EM_ROTA'
  | 'FINALIZADO'
  | 'CANCELADO'

export type EstadoEtapaAcompanhamento = 'feito' | 'atual' | 'futuro'

export type LadoEtapaAcompanhamento = 'esquerda' | 'direita'

export type EtapaAcompanhamentoPedido = {
  status: StatusAcompanhamentoPedido
  rotulo: string
  lado: LadoEtapaAcompanhamento
  estado: EstadoEtapaAcompanhamento
}

const ROTULO: Record<StatusAcompanhamentoPedido, string> = {
  PENDENTE: 'Pendente',
  EM_PREPARO: 'Em preparo',
  PRONTO: 'Pronto',
  EM_ROTA: 'Em rota',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
}

const ETAPAS_ENTREGA: StatusAcompanhamentoPedido[] = [
  'PENDENTE',
  'EM_PREPARO',
  'PRONTO',
  'EM_ROTA',
  'FINALIZADO',
]

const ETAPAS_RETIRADA: StatusAcompanhamentoPedido[] = [
  'PENDENTE',
  'EM_PREPARO',
  'PRONTO',
  'FINALIZADO',
]

function etapa(
  status: StatusAcompanhamentoPedido,
  index: number,
  estado: EstadoEtapaAcompanhamento
): EtapaAcompanhamentoPedido {
  return {
    status,
    rotulo: ROTULO[status],
    lado: index % 2 === 0 ? 'esquerda' : 'direita',
    estado,
  }
}

/**
 * Sequência visível do acompanhamento.
 * Entrega inclui Em rota. Retirada vai de Pronto para Finalizado.
 * Cancelado encerra a barra nesse rótulo.
 */
export function montarEtapasAcompanhamentoPedido(
  tipoEntrega: DeliveryTipoEntrega,
  statusAtual: StatusAcompanhamentoPedido
): EtapaAcompanhamentoPedido[] {
  if (statusAtual === 'CANCELADO') {
    return [etapa('CANCELADO', 0, 'atual')]
  }

  const etapas = tipoEntrega === 'retirada' ? ETAPAS_RETIRADA : ETAPAS_ENTREGA
  const indiceAtual = Math.max(0, etapas.indexOf(statusAtual))

  return etapas.map((status, index) => {
    let estado: EstadoEtapaAcompanhamento = 'futuro'
    if (index < indiceAtual) estado = 'feito'
    else if (index === indiceAtual) estado = 'atual'
    return etapa(status, index, estado)
  })
}
