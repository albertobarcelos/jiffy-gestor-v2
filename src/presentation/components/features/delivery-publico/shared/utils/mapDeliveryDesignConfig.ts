import {
  createDefaultDeliveryPublicoDesignConfig,
  type DeliveryPublicoDesignConfigDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'
import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'
import { createDefaultDesignConfig } from '../constants/defaultDesignConfig'
import { resolveCustomPaletteColors } from '../constants/colorPalettes'
import { mergeCategoriasDesignConfig } from './mergeCategoriasDesignConfig'

/**
 * API → UI do customizer (campos obrigatórios da tela + merge com defaults).
 */
export function apiDesignConfigToUi(
  dto: DeliveryPublicoDesignConfigDTO,
  nomeExibicaoFallback = ''
): DeliveryPublicoDesignConfig {
  const fallback = createDefaultDesignConfig(nomeExibicaoFallback)

  return {
    layoutId: dto.layoutId,
    cabecalho: {
      nomeExibicao: (
        dto.cabecalho.nomeExibicao ??
        fallback.cabecalho.nomeExibicao
      ).slice(0, 20),
      logoUrl: dto.cabecalho.logoUrl ?? null,
      logoFormato: dto.cabecalho.logoFormato,
      capaUrl: dto.cabecalho.capaUrl ?? null,
    },
    cores: {
      paletaId: dto.cores.paletaId,
      ...(dto.cores.personalizadas
        ? {
            personalizadas: resolveCustomPaletteColors(dto.cores.personalizadas),
          }
        : {}),
    },
    tipografia: {
      presetId: dto.tipografia.presetId,
    },
    categorias: mergeCategoriasDesignConfig(dto.categorias, fallback.categorias),
  }
}

/**
 * UI → payload canônico da API (`schemaVersion: 1`).
 * Não envia blob:/data: (preview local) para não gravar URL inválida no draft.
 */
export function uiDesignConfigToApi(
  ui: DeliveryPublicoDesignConfig
): DeliveryPublicoDesignConfigDTO {
  const nome = ui.cabecalho.nomeExibicao.trim()
  const base = createDefaultDeliveryPublicoDesignConfig(nome)
  const logoUrl = ui.cabecalho.logoUrl?.trim() || null
  const capaUrl = ui.cabecalho.capaUrl?.trim() || null
  const logoPersistivel =
    logoUrl && !logoUrl.startsWith('blob:') && !logoUrl.startsWith('data:')
      ? logoUrl
      : null
  const capaPersistivel =
    capaUrl && !capaUrl.startsWith('blob:') && !capaUrl.startsWith('data:')
      ? capaUrl
      : null

  return {
    ...base,
    layoutId: ui.layoutId,
    cabecalho: {
      logoFormato: ui.cabecalho.logoFormato,
      ...(nome ? { nomeExibicao: nome.slice(0, 20) } : {}),
      logoUrl: logoPersistivel,
      capaUrl: capaPersistivel,
    },
    cores: {
      paletaId: ui.cores.paletaId,
      ...(ui.cores.personalizadas
        ? {
            personalizadas: resolveCustomPaletteColors(ui.cores.personalizadas),
          }
        : {}),
    },
    tipografia: {
      presetId: ui.tipografia.presetId,
    },
    categorias: {
      tituloGrupoFundo: ui.categorias.tituloGrupoFundo,
      corBarraTitulo: ui.categorias.corBarraTitulo,
      corTextoTitulo: ui.categorias.corTextoTitulo,
      mostrarNomeTitulo: ui.categorias.mostrarNomeTitulo,
      mostrarSugestoesDaCasa: ui.categorias.mostrarSugestoesDaCasa,
      sugestoesDaCasaImagemUrl: ui.categorias.sugestoesDaCasaImagemUrl,
    },
  }
}
