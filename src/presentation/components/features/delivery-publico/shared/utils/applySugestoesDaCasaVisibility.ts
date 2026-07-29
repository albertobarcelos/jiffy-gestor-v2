import {
  DELIVERY_PUBLICO_GRUPO_SUGESTOES_ICON,
  DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID,
  DELIVERY_PUBLICO_GRUPO_SUGESTOES_NOME,
} from '../constants/deliveryPublicoSugestoes'
import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'
import type {
  DeliveryPublicoGrupoViewModel,
  DeliveryPublicoViewModel,
} from '../types/deliveryPublicoViewModel'

function isGrupoSugestoes(grupo: DeliveryPublicoGrupoViewModel): boolean {
  return grupo.id === DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID
}

/** Remove o grupo sintético Sugestões da Casa da lista. */
export function omitGrupoSugestoes(
  grupos: DeliveryPublicoGrupoViewModel[]
): DeliveryPublicoGrupoViewModel[] {
  return grupos.filter(grupo => !isGrupoSugestoes(grupo))
}

/**
 * Monta um grupo Sugestões para o preview do Design
 * (amostra dos primeiros produtos dos grupos reais/mock).
 */
export function buildPreviewGrupoSugestoes(
  grupos: DeliveryPublicoGrupoViewModel[]
): DeliveryPublicoGrupoViewModel {
  const base = omitGrupoSugestoes(grupos)
  const amostras = base.flatMap(grupo => grupo.produtos).slice(0, 4)
  const produtos =
    amostras.length > 0
      ? amostras
      : [
          {
            id: 'preview-sugestao-1',
            nome: 'Sugestão exemplo',
            descricao: 'Produto em destaque no preview',
            preco: 19.9,
            imagemUrl: null as string | null,
            grupoId: 'preview',
            temComplementos: false,
          },
        ]

  return {
    id: DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID,
    nome: DELIVERY_PUBLICO_GRUPO_SUGESTOES_NOME,
    iconName: DELIVERY_PUBLICO_GRUPO_SUGESTOES_ICON,
    cor: null,
    imagemUrl: null,
    produtos,
  }
}

/**
 * Garante Sugestões no início da lista (preview) ou remove conforme o design.
 */
export function applySugestoesDaCasaVisibility(
  viewModel: DeliveryPublicoViewModel,
  config: DeliveryPublicoDesignConfig,
  options?: { injectPreviewFallback?: boolean }
): DeliveryPublicoViewModel {
  const mostrar = config.categorias.mostrarSugestoesDaCasa !== false
  const semSugestoes = omitGrupoSugestoes(viewModel.grupos)

  if (!mostrar) {
    return { ...viewModel, grupos: semSugestoes }
  }

  const existente = viewModel.grupos.find(isGrupoSugestoes)
  if (existente) {
    return {
      ...viewModel,
      grupos: [existente, ...semSugestoes],
    }
  }

  if (!options?.injectPreviewFallback) {
    return viewModel
  }

  return {
    ...viewModel,
    grupos: [buildPreviewGrupoSugestoes(semSugestoes), ...semSugestoes],
  }
}
