import type { DeliveryPublicoDesignUiModel } from '@/src/application/mappers/DeliveryDesignConfigMapper'
import { apiDesignConfigToUi } from '@/src/application/mappers/DeliveryDesignConfigMapper'
import { createDefaultDeliveryPublicoDesignConfig } from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'

const CUSTOM_PALETTE_DEFAULTS = {
  primary: '#525252',
  primaryDark: '#171717',
  surface: '#FFFFFF',
  text: '#171A1C',
}

const HEX6 = /^#[0-9A-Fa-f]{6}$/

type CategoriasParcial = {
  tituloGrupoFundo?: 'cor' | 'imagem'
  corBarraTitulo?: string | null
  corTextoTitulo?: string | null
  mostrarNomeTitulo?: boolean
  mostrarSugestoesDaCasa?: boolean
  sugestoesDaCasaImagemUrl?: string | null
}

function textoOuNulo(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function hexOuNulo(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return HEX6.test(trimmed) ? trimmed.toUpperCase() : null
}

function mesclarCategorias(
  partial: CategoriasParcial | undefined,
  fallback: DeliveryPublicoDesignUiModel['categorias']
): DeliveryPublicoDesignUiModel['categorias'] {
  if (!partial) return fallback
  return {
    tituloGrupoFundo:
      partial.tituloGrupoFundo === 'cor' || partial.tituloGrupoFundo === 'imagem'
        ? partial.tituloGrupoFundo
        : fallback.tituloGrupoFundo,
    corBarraTitulo:
      partial.corBarraTitulo !== undefined
        ? hexOuNulo(partial.corBarraTitulo)
        : fallback.corBarraTitulo,
    corTextoTitulo:
      partial.corTextoTitulo !== undefined
        ? hexOuNulo(partial.corTextoTitulo)
        : fallback.corTextoTitulo,
    mostrarNomeTitulo:
      typeof partial.mostrarNomeTitulo === 'boolean'
        ? partial.mostrarNomeTitulo
        : fallback.mostrarNomeTitulo,
    mostrarSugestoesDaCasa:
      typeof partial.mostrarSugestoesDaCasa === 'boolean'
        ? partial.mostrarSugestoesDaCasa
        : fallback.mostrarSugestoesDaCasa,
    sugestoesDaCasaImagemUrl:
      partial.sugestoesDaCasaImagemUrl !== undefined
        ? textoOuNulo(partial.sugestoesDaCasaImagemUrl)
        : fallback.sugestoesDaCasaImagemUrl,
  }
}

function mesclarConfig(
  partial: Partial<DeliveryPublicoDesignUiModel> | undefined,
  fallback: DeliveryPublicoDesignUiModel
): DeliveryPublicoDesignUiModel {
  if (!partial) return fallback
  const { elementosDestaque: _legado, ...resto } = partial as Partial<DeliveryPublicoDesignUiModel> & {
    elementosDestaque?: unknown
  }
  return {
    ...fallback,
    ...resto,
    cabecalho: { ...fallback.cabecalho, ...partial.cabecalho },
    cores: {
      ...fallback.cores,
      ...partial.cores,
      personalizadas: partial.cores?.personalizadas
        ? { ...CUSTOM_PALETTE_DEFAULTS, ...partial.cores.personalizadas }
        : fallback.cores.personalizadas,
    },
    tipografia: { ...fallback.tipografia, ...partial.tipografia },
    categorias: mesclarCategorias(partial.categorias, fallback.categorias),
  }
}

export function fallbackDesignLocal(nomeExibicao = ''): DeliveryPublicoDesignUiModel {
  return apiDesignConfigToUi(createDefaultDeliveryPublicoDesignConfig(nomeExibicao), nomeExibicao)
}

export function lerDesignLocal(
  raw: string | null,
  nomeExibicaoFallback = ''
): { draft: DeliveryPublicoDesignUiModel; published: DeliveryPublicoDesignUiModel } {
  const defaults = fallbackDesignLocal(nomeExibicaoFallback)
  if (!raw) return { draft: defaults, published: defaults }
  try {
    const parsed = JSON.parse(raw) as {
      draft?: Partial<DeliveryPublicoDesignUiModel>
      published?: Partial<DeliveryPublicoDesignUiModel>
    }
    const published = mesclarConfig(parsed.published, defaults)
    const draft = mesclarConfig(parsed.draft, published)
    return { draft, published }
  } catch {
    return { draft: defaults, published: defaults }
  }
}

export function assinaturaVisualDesign(config: DeliveryPublicoDesignUiModel): string {
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

export function designEhEssencialmentePadrao(
  config: DeliveryPublicoDesignUiModel,
  nomeExibicaoFallback = ''
): boolean {
  return (
    assinaturaVisualDesign(config) ===
    assinaturaVisualDesign(fallbackDesignLocal(nomeExibicaoFallback))
  )
}

export function montarDesignPadraoPreservandoCabecalho(
  current: DeliveryPublicoDesignUiModel,
  nomeExibicaoFallback: string
): DeliveryPublicoDesignUiModel {
  const defaults = fallbackDesignLocal(nomeExibicaoFallback)
  return {
    ...defaults,
    cabecalho: {
      ...defaults.cabecalho,
      nomeExibicao: current.cabecalho.nomeExibicao,
      logoUrl: current.cabecalho.logoUrl,
      capaUrl: current.cabecalho.capaUrl,
    },
  }
}
