import type { DeliveryPublicoDesignUiModel } from '@/src/application/mappers/DeliveryDesignConfigMapper'
import type { IDesignConfigStorage } from '@/src/application/ports/IDesignConfigStorage'
import { designEhEssencialmentePadrao, lerDesignLocal } from './lerDesignLocal'

export function deveOferecerMigracaoDesignLocal(
  storage: IDesignConfigStorage,
  input: {
    empresaId: string
    publishedAt: string | null
    serverDraft: DeliveryPublicoDesignUiModel
    serverPublished: DeliveryPublicoDesignUiModel
    nomeExibicaoFallback?: string
  }
): boolean {
  if (typeof localStorage === 'undefined') return false
  if (storage.getMarker(input.empresaId)) return false
  if (!storage.has(input.empresaId)) return false
  if (input.publishedAt != null) return false

  const nome = input.nomeExibicaoFallback ?? ''
  if (
    !designEhEssencialmentePadrao(input.serverDraft, nome) ||
    !designEhEssencialmentePadrao(input.serverPublished, nome)
  ) {
    return false
  }

  const local = lerDesignLocal(storage.readRaw(input.empresaId), nome)
  return (
    !designEhEssencialmentePadrao(local.draft, nome) ||
    !designEhEssencialmentePadrao(local.published, nome)
  )
}
