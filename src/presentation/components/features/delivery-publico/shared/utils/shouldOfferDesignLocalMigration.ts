import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'
import {
  getDesignMigrationMarker,
  hasDesignStorage,
  isEssentiallyDefaultDesign,
  readDesignStorage,
} from './designConfigStorage'

export type ShouldOfferDesignLocalMigrationInput = {
  empresaId: string
  /** ISO do servidor; `null` = nunca publicado via API. */
  publishedAt: string | null
  serverDraft: DeliveryPublicoDesignConfig
  serverPublished: DeliveryPublicoDesignConfig
  nomeExibicaoFallback?: string
}

/**
 * Oferece import one-shot quando a conta ainda está nos defaults da API
 * e este aparelho tem design local rico (e ainda não migrou/dismissou).
 */
export function shouldOfferDesignLocalMigration(
  input: ShouldOfferDesignLocalMigrationInput
): boolean {
  if (typeof localStorage === 'undefined') return false
  if (getDesignMigrationMarker(input.empresaId)) return false
  if (!hasDesignStorage(input.empresaId)) return false
  if (input.publishedAt != null) return false

  const nome = input.nomeExibicaoFallback ?? ''
  if (
    !isEssentiallyDefaultDesign(input.serverDraft, nome) ||
    !isEssentiallyDefaultDesign(input.serverPublished, nome)
  ) {
    return false
  }

  const local = readDesignStorage(input.empresaId, nome)
  return (
    !isEssentiallyDefaultDesign(local.draft, nome) ||
    !isEssentiallyDefaultDesign(local.published, nome)
  )
}

/** Migração local ligada por padrão; `NEXT_PUBLIC_DESIGN_MIGRATE_LOCAL=0` desliga. */
export function isDesignLocalMigrationEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DESIGN_MIGRATE_LOCAL !== '0'
}
