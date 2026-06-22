import type { DeliveryCupomTemplateConfig } from '@/src/shared/types/deliveryCupomTemplate'
import { parseDeliveryCupomTemplate } from '@/src/shared/utils/parseDeliveryCupomTemplate'

const KEY_PREFIX = 'jiffy-delivery-cupom-template'

function key(empresaId: string): string {
  return `${KEY_PREFIX}:${empresaId}`
}

export function getDeliveryCupomTemplateLocal(
  empresaId: string | null | undefined
): DeliveryCupomTemplateConfig | null {
  if (typeof window === 'undefined') return null
  const id = empresaId?.trim()
  if (!id) return null

  try {
    const raw = window.localStorage.getItem(key(id))
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    return parseDeliveryCupomTemplate({ cupomDeliveryTemplate: parsed })
  } catch {
    return null
  }
}

export function salvarDeliveryCupomTemplateLocal(
  empresaId: string | null | undefined,
  template: DeliveryCupomTemplateConfig
): void {
  if (typeof window === 'undefined') return
  const id = empresaId?.trim()
  if (!id) return

  try {
    window.localStorage.setItem(key(id), JSON.stringify(template))
  } catch {
    /* storage indisponível */
  }
}

