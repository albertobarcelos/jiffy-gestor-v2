import {
  deliveryPublicoDesignConfigSchema,
  type DeliveryPublicoDesignConfigDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'
import { createDefaultDesignConfig } from '../constants/defaultDesignConfig'
import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'

/**
 * API (DTO) → UI. Espelho do mapper do gestor (sem dependência cross-app).
 * Mantido local no cardápio por isolamento do package `@/`.
 */
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
    categorias: {
      tituloGrupoFundo: config.categorias.tituloGrupoFundo,
      corBarraTitulo: config.categorias.corBarraTitulo,
      corTextoTitulo: config.categorias.corTextoTitulo,
      mostrarNomeTitulo: config.categorias.mostrarNomeTitulo,
      mostrarSugestoesDaCasa: config.categorias.mostrarSugestoesDaCasa,
      sugestoesDaCasaImagemUrl: config.categorias.sugestoesDaCasaImagemUrl ?? null,
    },
  }
}

export type { DeliveryPublicoDesignConfigDTO }
