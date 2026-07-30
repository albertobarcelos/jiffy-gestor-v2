import {
  DELIVERY_PUBLICO_GRUPO_SUGESTOES_ICON,
  DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID,
  DELIVERY_PUBLICO_GRUPO_SUGESTOES_NOME,
  findGrupoSugestoesDaCasaCarrier,
  omitGrupoSugestoesDaCasaCarrier,
} from '../constants/deliveryPublicoSugestoes'
import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'
import type {
  DeliveryPublicoGrupoViewModel,
  DeliveryPublicoViewModel,
} from '../types/deliveryPublicoViewModel'

function isGrupoSugestoesSintetico(grupo: DeliveryPublicoGrupoViewModel): boolean {
  return grupo.id === DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID
}

/** Remove o grupo sintético e o grupo real portador da lista. */
export function omitGrupoSugestoes(
  grupos: DeliveryPublicoGrupoViewModel[]
): DeliveryPublicoGrupoViewModel[] {
  return omitGrupoSugestoesDaCasaCarrier(grupos).filter(grupo => !isGrupoSugestoesSintetico(grupo))
}

function grupoSugestoesDisponivel(grupos: DeliveryPublicoGrupoViewModel[]): boolean {
  return (
    Boolean(findGrupoSugestoesDaCasaCarrier(grupos)) ||
    grupos.some(isGrupoSugestoesSintetico)
  )
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
 * Garante Sugestões no início da lista ou remove conforme o design.
 * Exige grupo real "Sugestões da Casa" no cardápio (além do switch).
 * A imagem da barra vem do `imagemUrl` desse grupo real (CDN).
 */
export function applySugestoesDaCasaVisibility(
  viewModel: DeliveryPublicoViewModel,
  config: DeliveryPublicoDesignConfig,
  options?: { injectPreviewFallback?: boolean }
): DeliveryPublicoViewModel {
  const carrier = findGrupoSugestoesDaCasaCarrier(viewModel.grupos)
  const disponivel = grupoSugestoesDisponivel(viewModel.grupos)
  const semSugestoes = omitGrupoSugestoes(viewModel.grupos)
  const imagemUrl = carrier?.imagemUrl?.trim() || null

  const mostrar = config.categorias.mostrarSugestoesDaCasa !== false && disponivel

  if (!mostrar) {
    return { ...viewModel, grupos: semSugestoes }
  }

  const existente = viewModel.grupos.find(isGrupoSugestoesSintetico)
  if (existente) {
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

  if (!options?.injectPreviewFallback || !carrier) {
    return { ...viewModel, grupos: semSugestoes }
  }

  return {
    ...viewModel,
    grupos: [buildPreviewGrupoSugestoes(semSugestoes, imagemUrl), ...semSugestoes],
  }
}
