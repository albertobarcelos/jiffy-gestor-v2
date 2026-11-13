import { deveOferecerMigracaoDesignLocal } from '@/src/application/services/delivery/deveOferecerMigracaoDesignLocal'
import { designConfigLocalStorage } from '@/src/infrastructure/composition/deliveryDesignUseCases'
import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'

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
  return deveOferecerMigracaoDesignLocal(designConfigLocalStorage, input)
}

/** Migração local ligada por padrão; `NEXT_PUBLIC_DESIGN_MIGRATE_LOCAL=0` desliga. */
export function isDesignLocalMigrationEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DESIGN_MIGRATE_LOCAL !== '0'
}
