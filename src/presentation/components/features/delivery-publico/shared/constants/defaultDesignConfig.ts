import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'
import { PREVIEW_DESIGN_CATEGORIES } from './previewCatalogMock'

export const CABECALHO_NOME_MAX_LENGTH = 20

export function createDefaultDesignConfig(nomeExibicao = ''): DeliveryPublicoDesignConfig {
  const iconesPorGrupoId = Object.fromEntries(
    PREVIEW_DESIGN_CATEGORIES.map(c => [c.id, c.iconName])
  )

  return {
    layoutId: 'basico',
    cabecalho: {
      nomeExibicao: nomeExibicao.slice(0, CABECALHO_NOME_MAX_LENGTH),
      logoUrl: null,
      logoFormato: 'circular',
      capaUrl: null,
    },
    cores: {
      paletaId: 'lavanda',
    },
    tipografia: {
      presetId: 'urbana',
    },
    categorias: {
      mostrar: true,
      estiloIcone: 'linha',
      iconesPorGrupoId,
    },
    elementosDestaque: {
      corFundoModo: 'principal',
      corFundoPersonalizada: '#171A1C',
      carrosselAtivo: false,
      imagensDesktop: [],
      imagensMobile: [],
      usarImagensMobileDistintas: false,
    },
  }
}
