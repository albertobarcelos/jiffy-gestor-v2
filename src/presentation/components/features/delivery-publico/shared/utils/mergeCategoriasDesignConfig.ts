import type {
  DeliveryPublicoDesignConfig,
  GrupoTituloFundoMode,
} from '../types/deliveryPublicoDesignConfig'

const HEX6 = /^#[0-9A-Fa-f]{6}$/

type CategoriasLegacyPartial = {
  tituloGrupoFundo?: GrupoTituloFundoMode
  corBarraTitulo?: string | null
  corTextoTitulo?: string | null
  mostrarNomeTitulo?: boolean
  mostrarSugestoesDaCasa?: boolean
  /** Legado: chips on/off — ignorado (chips sempre visíveis). */
  mostrar?: boolean
  /** Legado: imagem vs ícone nos chips — não mapeia para banner. */
  usarImagensGrupo?: boolean
  estiloIcone?: unknown
  iconesPorGrupoId?: unknown
}

function normalizeHexColor(value: unknown): string | null {
  if (value == null || value === '') return null
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return HEX6.test(trimmed) ? trimmed.toUpperCase() : null
}

function normalizeTituloFundo(value: unknown): GrupoTituloFundoMode | undefined {
  if (value === 'cor' || value === 'imagem') return value
  return undefined
}

/**
 * Mescla `categorias` do storage (inclui chaves legadas) no formato atual.
 */
export function mergeCategoriasDesignConfig(
  partial: CategoriasLegacyPartial | undefined,
  fallback: DeliveryPublicoDesignConfig['categorias']
): DeliveryPublicoDesignConfig['categorias'] {
  if (!partial) return fallback

  return {
    tituloGrupoFundo:
      normalizeTituloFundo(partial.tituloGrupoFundo) ?? fallback.tituloGrupoFundo,
    corBarraTitulo:
      partial.corBarraTitulo !== undefined
        ? normalizeHexColor(partial.corBarraTitulo)
        : fallback.corBarraTitulo,
    corTextoTitulo:
      partial.corTextoTitulo !== undefined
        ? normalizeHexColor(partial.corTextoTitulo)
        : fallback.corTextoTitulo,
    mostrarNomeTitulo:
      typeof partial.mostrarNomeTitulo === 'boolean'
        ? partial.mostrarNomeTitulo
        : fallback.mostrarNomeTitulo,
    mostrarSugestoesDaCasa:
      typeof partial.mostrarSugestoesDaCasa === 'boolean'
        ? partial.mostrarSugestoesDaCasa
        : fallback.mostrarSugestoesDaCasa,
  }
}
