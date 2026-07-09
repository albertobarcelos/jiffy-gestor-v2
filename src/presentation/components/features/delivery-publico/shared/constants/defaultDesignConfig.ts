import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'

export const CABECALHO_NOME_MAX_LENGTH = 20

export function createDefaultDesignConfig(nomeExibicao = ''): DeliveryPublicoDesignConfig {
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
      usarImagensGrupo: false,
      estiloIcone: 'linha',
      iconesPorGrupoId: {},
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
