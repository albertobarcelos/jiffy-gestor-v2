import { EtapaOperacionalDelivery } from '@/src/domain/value-objects/EtapaOperacionalDelivery'
import type { EtapaOperacionalDeliveryValor } from '@/src/domain/types/etapaOperacionalDelivery'

export type StatusAtePronto = Extract<EtapaOperacionalDeliveryValor, 'EM_PREPARO' | 'PRONTO'>

/**
 * Leitura na bancada: o QR da via de produção marca Pronto.
 * PENDENTE ainda precisa passar por Em preparo (a API não pula).
 */
export function statusesAtePronto(etapa: string | null | undefined): StatusAtePronto[] {
  const atual = EtapaOperacionalDelivery.tryParse(etapa)?.valor
  if (atual === 'PENDENTE') return ['EM_PREPARO', 'PRONTO']
  if (atual === 'EM_PREPARO') return ['PRONTO']
  return []
}

/** Expedir / fim da conferência: só Em rota. */
export function statusesAteEmRota(etapa: string | null | undefined): Array<'EM_ROTA'> {
  const atual = EtapaOperacionalDelivery.tryParse(etapa)?.valor
  return atual === 'PRONTO' ? ['EM_ROTA'] : []
}
