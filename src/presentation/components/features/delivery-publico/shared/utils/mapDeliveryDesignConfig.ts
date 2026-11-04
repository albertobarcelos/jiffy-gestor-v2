import {
  createDefaultDeliveryPublicoDesignConfig,
  deliveryPublicoDesignConfigSchema,
  type DeliveryPublicoDesignConfigDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'
import { createDefaultDesignConfig } from '../constants/defaultDesignConfig'
import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'
import { mergeCategoriasDesignConfig } from './mergeCategoriasDesignConfig'

function stripLocalPreviewUrl(url: string | null | undefined): string | null | undefined {
  if (url === undefined) return undefined
  if (url === null) return null
  const trimmed = url.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) return null
  return trimmed
}

/** API (DTO) → UI (tipo de apresentação). */
export function apiDesignConfigToUi(
  dto: unknown,
  nomeExibicaoFallback = ''
): DeliveryPublicoDesignConfig {
  const parsed = deliveryPublicoDesignConfigSchema.safeParse(dto)
  const base = createDefaultDesignConfig(nomeExibicaoFallback)
  if (!parsed.success) return base

  const config = parsed.data
  return {
    layoutId: config.layoutId,
    cabecalho: {
      nomeExibicao:
        config.cabecalho.nomeExibicao?.trim() ||
        nomeExibicaoFallback.trim().slice(0, 20),
      logoUrl: config.cabecalho.logoUrl ?? null,
      logoFormato: config.cabecalho.logoFormato,
      capaUrl: config.cabecalho.capaUrl ?? null,
    },
    cores: {
      paletaId: config.cores.paletaId,
      ...(config.cores.personalizadas
        ? { personalizadas: config.cores.personalizadas }
        : {}),
    },
    tipografia: { presetId: config.tipografia.presetId },
    categorias: mergeCategoriasDesignConfig(
      {
        tituloGrupoFundo: config.categorias.tituloGrupoFundo,
        corBarraTitulo: config.categorias.corBarraTitulo,
        corTextoTitulo: config.categorias.corTextoTitulo,
        mostrarNomeTitulo: config.categorias.mostrarNomeTitulo,
        mostrarSugestoesDaCasa: config.categorias.mostrarSugestoesDaCasa,
        sugestoesDaCasaImagemUrl: config.categorias.sugestoesDaCasaImagemUrl ?? null,
      },
      base.categorias
    ),
  }
}

/** UI → API (DTO canônico). Filtra blob:/data:. */
export function uiDesignConfigToApi(
  ui: DeliveryPublicoDesignConfig
): DeliveryPublicoDesignConfigDTO {
  const defaults = createDefaultDeliveryPublicoDesignConfig(ui.cabecalho.nomeExibicao)
  return deliveryPublicoDesignConfigSchema.parse({
    schemaVersion: 1,
    layoutId: ui.layoutId,
    cabecalho: {
      logoFormato: ui.cabecalho.logoFormato,
      nomeExibicao: ui.cabecalho.nomeExibicao.trim().slice(0, 20) || undefined,
      logoUrl: stripLocalPreviewUrl(ui.cabecalho.logoUrl) ?? null,
      capaUrl: stripLocalPreviewUrl(ui.cabecalho.capaUrl) ?? null,
    },
    cores: {
      paletaId: ui.cores.paletaId,
      ...(ui.cores.personalizadas ? { personalizadas: ui.cores.personalizadas } : {}),
    },
    tipografia: { presetId: ui.tipografia.presetId },
    categorias: {
      tituloGrupoFundo: ui.categorias.tituloGrupoFundo,
      corBarraTitulo: ui.categorias.corBarraTitulo,
      corTextoTitulo: ui.categorias.corTextoTitulo,
      mostrarNomeTitulo: ui.categorias.mostrarNomeTitulo,
      mostrarSugestoesDaCasa:
        (ui.categorias as { mostrarSugestoesDaCasa?: boolean }).mostrarSugestoesDaCasa ??
        defaults.categorias.mostrarSugestoesDaCasa,
      sugestoesDaCasaImagemUrl:
        stripLocalPreviewUrl(ui.categorias.sugestoesDaCasaImagemUrl) ?? null,
    },
  })
}
