import type {
  DeliveryDesignStorage,
  DeliveryPublicoDesignConfig,
} from '../types/deliveryPublicoDesignConfig'
import { createDefaultDesignConfig } from '../constants/defaultDesignConfig'
import { resolveCustomPaletteColors } from '../constants/colorPalettes'

const STORAGE_PREFIX = 'jiffy:delivery-design'

function storageKeyByEmpresa(empresaId: string): string {
  return `${STORAGE_PREFIX}:empresa:${empresaId}`
}

function storageKeyBySlug(slug: string): string {
  return `${STORAGE_PREFIX}:slug:${slug.trim().toLowerCase()}`
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
    categorias: {
      ...fallback.categorias,
      ...partial.categorias,
      iconesPorGrupoId: {
        ...fallback.categorias.iconesPorGrupoId,
        ...partial.categorias?.iconesPorGrupoId,
      },
    },
  }
}

export function readDesignStorage(
  empresaId: string,
  nomeExibicaoFallback = ''
): DeliveryDesignStorage {
  if (typeof window === 'undefined') {
    const defaults = createDefaultDesignConfig(nomeExibicaoFallback)
    return { published: defaults, draft: defaults }
  }

  try {
    const raw = window.localStorage.getItem(storageKeyByEmpresa(empresaId))
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

export function writeDesignStorage(empresaId: string, storage: DeliveryDesignStorage): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(storageKeyByEmpresa(empresaId), JSON.stringify(storage))
}

/** Design publicado consumido pelo app em `/cardapio/{slug}`. */
export function readPublishedDesignBySlug(
  slug: string,
  nomeExibicaoFallback = ''
): DeliveryPublicoDesignConfig {
  const fallback = createDefaultDesignConfig(nomeExibicaoFallback)

  if (typeof window === 'undefined') return fallback

  try {
    const raw = window.localStorage.getItem(storageKeyBySlug(slug))
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
  if (typeof window === 'undefined') return
  window.localStorage.setItem(storageKeyBySlug(slug.trim().toLowerCase()), JSON.stringify(config))
}

export function isDesignConfigEqual(
  a: DeliveryPublicoDesignConfig,
  b: DeliveryPublicoDesignConfig
): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}
