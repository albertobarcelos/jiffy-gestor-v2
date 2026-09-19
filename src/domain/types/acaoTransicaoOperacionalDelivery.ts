import type { EtapaOperacionalDeliveryValor } from '@/src/domain/types/etapaOperacionalDelivery'

/** Ações do Gestor que avançam a etapa operacional do delivery. */
export type AcaoTransicaoOperacionalDelivery =
  | 'iniciar_preparo'
  | 'marcar_pronto'
  | 'despachar'
  | 'finalizar'
  | 'cancelar'

export function etapaAposAcaoTransicao(
  acao: AcaoTransicaoOperacionalDelivery
): EtapaOperacionalDeliveryValor {
  switch (acao) {
    case 'iniciar_preparo':
      return 'EM_PREPARO'
    case 'marcar_pronto':
      return 'PRONTO'
    case 'despachar':
      return 'EM_ROTA'
    case 'finalizar':
      return 'FINALIZADO'
    case 'cancelar':
      return 'CANCELADO'
    default:
      return 'PENDENTE'
  }
}
