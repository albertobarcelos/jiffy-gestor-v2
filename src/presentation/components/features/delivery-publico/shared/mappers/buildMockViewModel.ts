import {
  PREVIEW_DESIGN_CATEGORIES,
  PREVIEW_DESIGN_PRODUTOS,
  previewGrupoFallbackImagemUrl,
} from '../constants/previewCatalogMock'
import { DELIVERY_PUBLICO_HORARIO_PLACEHOLDER } from '../constants/deliveryPublicoPlaceholders'
import type { DesignCategoriaGrupo } from '../types/designCategoriaGrupo'
import type {
  DeliveryPublicoGrupoViewModel,
  DeliveryPublicoViewModel,
} from '../types/deliveryPublicoViewModel'

function previewProdutoExemplo(grupoId: string, index = 0) {
  return {
    id: `preview-produto-${grupoId}-${index}`,
    nome: 'Produto exemplo',
    descricao: 'Visualização no preview do design',
    preco: 10,
    imagemUrl: null as string | null,
    grupoId,
    temComplementos: false,
  }
}

/** Vários cards por categoria para o preview mostrar rolagem horizontal (Catálogo). */
function previewProdutosExemplo(grupoId: string, quantidade = 3) {
  return Array.from({ length: quantidade }, (_, index) =>
    previewProdutoExemplo(grupoId, index)
  )
}

function buildMockGruposFromPreviewCatalog(): DeliveryPublicoGrupoViewModel[] {
  return PREVIEW_DESIGN_CATEGORIES.map(cat => {
    const produtos = PREVIEW_DESIGN_PRODUTOS.filter(p => p.grupoId === cat.id).map(p => ({
      id: p.id,
      nome: p.nome,
      descricao: p.descricao ?? null,
      preco: p.preco,
      precoRegular: 'precoRegular' in p ? (p.precoRegular ?? null) : null,
      descontoPercentual: 'descontoPercentual' in p ? (p.descontoPercentual ?? null) : null,
      imagemUrl: null as string | null,
      grupoId: p.grupoId,
      temComplementos: false,
    }))

    const base = produtos.length > 0 ? produtos : previewProdutosExemplo(cat.id)
    const faltam = Math.max(0, 3 - base.length)

    return {
      id: cat.id,
      nome: cat.nome,
      iconName: cat.iconName,
      // Mock sem API: placeholder neutro (não colorido).
      imagemUrl: previewGrupoFallbackImagemUrl(cat.id),
      // Garante barra de grupo + cards suficientes para sugerir carrossel horizontal.
      produtos:
        faltam > 0
          ? [...base, ...previewProdutosExemplo(`${cat.id}-extra`, faltam)]
          : base,
    }
  })
}

/**
 * Preview do Design com grupos reais: só usa `imagemUrl` quando já resolvida.
 * Sem fallback colorido — evita flash de “bolas” antes do carregamento.
 */
export function buildPreviewViewModelFromGrupos(
  grupos: DesignCategoriaGrupo[],
  overrides: Partial<DeliveryPublicoViewModel> = {}
): DeliveryPublicoViewModel {
  if (grupos.length === 0) {
    return buildMockDeliveryViewModel(overrides)
  }

  const viewGrupos: DeliveryPublicoGrupoViewModel[] = grupos.map(grupo => ({
    id: grupo.id,
    nome: grupo.nome,
    iconName: grupo.iconName,
    cor: grupo.cor,
    imagemUrl: grupo.imagemUrl?.trim() || null,
    produtos: previewProdutosExemplo(grupo.id),
  }))

  return buildMockDeliveryViewModel({ grupos: viewGrupos, ...overrides })
}

export function buildMockDeliveryViewModel(
  overrides: Partial<DeliveryPublicoViewModel> = {}
): DeliveryPublicoViewModel {
  const grupos = buildMockGruposFromPreviewCatalog()

  return {
    grupos,
    disponivel: true,
    horarioTexto: DELIVERY_PUBLICO_HORARIO_PLACEHOLDER,
    statusMensagem: 'Aberto, faça seu pedido!',
    statusDetalheHorario: 'até as 22:45',
    termoBusca: '',
    carrinho: { total: 80, quantidadeItens: 8 },
    ...overrides,
  }
}
