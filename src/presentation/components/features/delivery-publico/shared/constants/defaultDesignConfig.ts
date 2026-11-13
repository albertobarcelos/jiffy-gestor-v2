import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'

export const CABECALHO_NOME_MAX_LENGTH = 20

/** Nome de exibição do cabeçalho: sempre derivado do fantasia da empresa (com limite). */
export function nomeExibicaoCabecalhoFromEmpresa(nomeFantasiaOuExibicao: string): string {
  return nomeFantasiaOuExibicao.trim().slice(0, CABECALHO_NOME_MAX_LENGTH)
}

export function createDefaultDesignConfig(nomeExibicao = ''): DeliveryPublicoDesignConfig {
  return {
    layoutId: 'basico',
    cabecalho: {
      nomeExibicao: nomeExibicaoCabecalhoFromEmpresa(nomeExibicao),
      logoUrl: null,
      logoFormato: 'circular',
      capaUrl: null,
    },
    cores: {
      paletaId: 'carvao',
    },
    tipografia: {
      presetId: 'urbana',
    },
    categorias: {
      tituloGrupoFundo: 'imagem',
      corBarraTitulo: null,
      corTextoTitulo: null,
      mostrarNomeTitulo: true,
      mostrarSugestoesDaCasa: true,
      sugestoesDaCasaImagemUrl: null,
    },
  }
}

/** Garante que o nome do cabeçalho acompanhe o fantasia atual da empresa. */
export function syncNomeExibicaoCabecalho(
  config: DeliveryPublicoDesignConfig,
  nomeFantasiaOuExibicao: string
): DeliveryPublicoDesignConfig {
  const nomeExibicao = nomeExibicaoCabecalhoFromEmpresa(nomeFantasiaOuExibicao)
  if (config.cabecalho.nomeExibicao === nomeExibicao) return config
  return {
    ...config,
    cabecalho: {
      ...config.cabecalho,
      nomeExibicao,
    },
  }
}
