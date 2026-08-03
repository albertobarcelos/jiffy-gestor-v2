import type {
  DeliveryDesignStorage,
  DeliveryPublicoDesignConfig,
} from '../types/deliveryPublicoDesignConfig'
import { createDefaultDesignConfig } from '../constants/defaultDesignConfig'
import { resolveCustomPaletteColors } from '../constants/colorPalettes'
import { mergeCategoriasDesignConfig } from './mergeCategoriasDesignConfig'

const STORAGE_PREFIX = 'jiffy:delivery-design'

function getLocalStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage
  } catch {
    return null
  }
}

function storageKeyByEmpresa(empresaId: string): string {
  return `${STORAGE_PREFIX}:empresa:${empresaId}`
}

function storageKeyBySlug(slug: string): string {
  return `${STORAGE_PREFIX}:slug:${slug.trim().toLowerCase()}`
}

function storageKeyMigrated(empresaId: string): string {
  return `${STORAGE_PREFIX}:migrated:${empresaId}`
}

function mergeConfig(
  partial: Partial<DeliveryPublicoDesignConfig> | undefined,
  fallback: DeliveryPublicoDesignConfig
): DeliveryPublicoDesignConfig {
  if (!partial) return fallback

  const { elementosDestaque: _legacy, ...partialWithoutLegacy } = partial as Partial<
    DeliveryPublicoDesignConfig
  > & { elementosDestaque?: unknown }

  return {
    ...fallback,
    ...partialWithoutLegacy,
    cabecalho: { ...fallback.cabecalho, ...partial.cabecalho },
    cores: {
      ...fallback.cores,
      ...partial.cores,
      personalizadas: partial.cores?.personalizadas
        ? resolveCustomPaletteColors(partial.cores.personalizadas)
        : fallback.cores.personalizadas,
    },
    tipografia: { ...fallback.tipografia, ...partial.tipografia },
    categorias: mergeCategoriasDesignConfig(partial.categorias, fallback.categorias),
  }
}

/** Assinatura visual (ignora espelhos de nome/URL) para comparar com defaults. */
export function designConfigSignature(config: DeliveryPublicoDesignConfig): string {
  return JSON.stringify({
    layoutId: config.layoutId,
    logoFormato: config.cabecalho.logoFormato,
    cores: config.cores,
    tipografia: config.tipografia,
    categorias: {
      tituloGrupoFundo: config.categorias.tituloGrupoFundo,
      corBarraTitulo: config.categorias.corBarraTitulo,
      corTextoTitulo: config.categorias.corTextoTitulo,
      mostrarNomeTitulo: config.categorias.mostrarNomeTitulo,
      mostrarSugestoesDaCasa: config.categorias.mostrarSugestoesDaCasa,
      sugestoesDaCasaImagemUrl: config.categorias.sugestoesDaCasaImagemUrl ?? null,
    },
  })
}

export function isEssentiallyDefaultDesign(
  config: DeliveryPublicoDesignConfig,
  nomeExibicaoFallback = ''
): boolean {
  return (
    designConfigSignature(config) ===
    designConfigSignature(createDefaultDesignConfig(nomeExibicaoFallback))
  )
}

export function hasDesignStorage(empresaId: string): boolean {
  const storage = getLocalStorage()
  if (!storage) return false
  return storage.getItem(storageKeyByEmpresa(empresaId)) != null
}

export type DesignMigrationMarker = 'imported' | 'dismissed'

export function getDesignMigrationMarker(
  empresaId: string
): DesignMigrationMarker | null {
  const storage = getLocalStorage()
  if (!storage) return null
  const raw = storage.getItem(storageKeyMigrated(empresaId))
  if (raw === 'imported' || raw === 'dismissed') return raw
  if (raw === '1') return 'imported'
  return null
}

export function markDesignMigrated(
  empresaId: string,
  marker: DesignMigrationMarker = 'imported'
): void {
  const storage = getLocalStorage()
  if (!storage) return
  storage.setItem(storageKeyMigrated(empresaId), marker)
}

export function clearDesignStorageForEmpresa(
  empresaId: string,
  slug?: string
): void {
  const storage = getLocalStorage()
  if (!storage) return
  storage.removeItem(storageKeyByEmpresa(empresaId))
  if (slug?.trim()) {
    storage.removeItem(storageKeyBySlug(slug.trim()))
  }
}

export function readDesignStorage(
  empresaId: string,
  nomeExibicaoFallback = ''
): DeliveryDesignStorage {
  const storage = getLocalStorage()
  if (!storage) {
    const defaults = createDefaultDesignConfig(nomeExibicaoFallback)
    return { published: defaults, draft: defaults }
  }

  try {
    const raw = storage.getItem(storageKeyByEmpresa(empresaId))
    if (!raw) {
      const defaults = createDefaultDesignConfig(nomeExibicaoFallback)
      return { published: defaults, draft: defaults }
    }

    const parsed = JSON.parse(raw) as Partial<DeliveryDesignStorage>
    const fallback = createDefaultDesignConfig(nomeExibicaoFallback)
    const published = mergeConfig(parsed.published, fallback)
    const draft = mergeConfig(parsed.draft, published)
    return { published, draft }
  } catch {
    const defaults = createDefaultDesignConfig(nomeExibicaoFallback)
    return { published: defaults, draft: defaults }
  }
}

export function writeDesignStorage(empresaId: string, storageData: DeliveryDesignStorage): void {
  const storage = getLocalStorage()
  if (!storage) return
  storage.setItem(storageKeyByEmpresa(empresaId), JSON.stringify(storageData))
}

/** Design publicado legado por slug (só migração / compat). */
export function readPublishedDesignBySlug(
  slug: string,
  nomeExibicaoFallback = ''
): DeliveryPublicoDesignConfig {
  const fallback = createDefaultDesignConfig(nomeExibicaoFallback)
  const storage = getLocalStorage()
  if (!storage) return fallback

  try {
    const raw = storage.getItem(storageKeyBySlug(slug))
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<DeliveryPublicoDesignConfig>
    return mergeConfig(parsed, fallback)
  } catch {
    return fallback
  }
}

export function writePublishedDesignBySlug(
  slug: string,
  config: DeliveryPublicoDesignConfig
): void {
  const storage = getLocalStorage()
  if (!storage) return
  storage.setItem(storageKeyBySlug(slug.trim().toLowerCase()), JSON.stringify(config))
}

export function isDesignConfigEqual(
  a: DeliveryPublicoDesignConfig,
  b: DeliveryPublicoDesignConfig
): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}
