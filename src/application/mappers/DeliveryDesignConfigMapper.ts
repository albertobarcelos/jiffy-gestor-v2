import {
  createDefaultDeliveryPublicoDesignConfig,
  deliveryPublicoDesignConfigSchema,
  type DeliveryPublicoDesignConfigDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'

/**
 * Modelo de UI do design (sem schemaVersion).
 * Espelha o tipo de presentation; vive na application para o mapper não depender da UI.
 */
export type DeliveryPublicoDesignUiModel = {
  layoutId: DeliveryPublicoDesignConfigDTO['layoutId']
  cabecalho: {
    nomeExibicao: string
    logoUrl: string | null
    logoFormato: DeliveryPublicoDesignConfigDTO['cabecalho']['logoFormato']
    capaUrl: string | null
  }
  cores: {
    paletaId: DeliveryPublicoDesignConfigDTO['cores']['paletaId']
    personalizadas?: NonNullable<DeliveryPublicoDesignConfigDTO['cores']['personalizadas']>
  }
  tipografia: {
    presetId: DeliveryPublicoDesignConfigDTO['tipografia']['presetId']
  }
  categorias: {
    tituloGrupoFundo: DeliveryPublicoDesignConfigDTO['categorias']['tituloGrupoFundo']
    corBarraTitulo: string | null
    corTextoTitulo: string | null
    mostrarNomeTitulo: boolean
    sugestoesDaCasaImagemUrl: string | null
  }
}

function stripLocalPreviewUrl(url: string | null | undefined): string | null | undefined {
  if (url === undefined) return undefined
  if (url === null) return null
  const trimmed = url.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) return null
  return trimmed
}

/** API (DTO) → UI. */
export function apiDesignConfigToUi(
  dto: unknown,
  nomeExibicaoFallback = ''
): DeliveryPublicoDesignUiModel {
  const parsed = deliveryPublicoDesignConfigSchema.safeParse(dto)
  if (!parsed.success) {
    const defaults = createDefaultDeliveryPublicoDesignConfig(nomeExibicaoFallback)
    return {
      layoutId: defaults.layoutId,
      cabecalho: {
        nomeExibicao: nomeExibicaoFallback.trim().slice(0, 20),
        logoUrl: null,
        logoFormato: defaults.cabecalho.logoFormato,
        capaUrl: null,
      },
      cores: { paletaId: defaults.cores.paletaId },
      tipografia: { presetId: defaults.tipografia.presetId },
      categorias: {
        tituloGrupoFundo: defaults.categorias.tituloGrupoFundo,
        corBarraTitulo: defaults.categorias.corBarraTitulo,
        corTextoTitulo: defaults.categorias.corTextoTitulo,
        mostrarNomeTitulo: defaults.categorias.mostrarNomeTitulo,
        sugestoesDaCasaImagemUrl: defaults.categorias.sugestoesDaCasaImagemUrl ?? null,
      },
    }
  }

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
      sugestoesDaCasaImagemUrl: config.categorias.sugestoesDaCasaImagemUrl ?? null,
    },
  }
}

/** UI → API (DTO canônico). Filtra blob:/data:. */
export function uiDesignConfigToApi(
  ui: DeliveryPublicoDesignUiModel
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
