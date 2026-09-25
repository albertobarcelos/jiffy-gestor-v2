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

function isGrupoSugestoesSintetico(grupo: DeliveryPublicoGrupoViewModel): boolean {
  return grupo.id === DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID
}

/** Remove o carrossel sintético da lista. */
export function omitGrupoSugestoes(
  grupos: DeliveryPublicoGrupoViewModel[]
): DeliveryPublicoGrupoViewModel[] {
  return grupos.filter(grupo => !isGrupoSugestoesSintetico(grupo))
}

/**
 * Monta um grupo Sugestões para o preview do Design
 * (amostra dos primeiros produtos dos grupos reais/mock).
 */
export function buildPreviewGrupoSugestoes(
  grupos: DeliveryPublicoGrupoViewModel[],
  imagemUrl: string | null = null
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
    imagemUrl,
    produtos,
  }
}

/**
 * Mantém o carrossel de favoritos no início ou remove se estiver vazio/ausente.
 * No preview do Design, pode injetar amostra quando ainda não há sintético.
 */
export function applySugestoesDaCasaVisibility(
  viewModel: DeliveryPublicoViewModel,
  config: DeliveryPublicoDesignConfig,
  options?: { injectPreviewFallback?: boolean }
): DeliveryPublicoViewModel {
  const semSugestoes = omitGrupoSugestoes(viewModel.grupos)
  const imagemUrl = config.categorias.sugestoesDaCasaImagemUrl?.trim() || null

  const existente = viewModel.grupos.find(isGrupoSugestoesSintetico)
  if (existente && existente.produtos.length > 0) {
    return {
      ...viewModel,
      grupos: [
        {
          ...existente,
          imagemUrl: existente.imagemUrl?.trim() || imagemUrl,
        },
        ...semSugestoes,
      ],
    }
  }

  if (options?.injectPreviewFallback) {
    return {
      ...viewModel,
      grupos: [buildPreviewGrupoSugestoes(semSugestoes, imagemUrl), ...semSugestoes],
    }
  }

  return { ...viewModel, grupos: semSugestoes }
}
