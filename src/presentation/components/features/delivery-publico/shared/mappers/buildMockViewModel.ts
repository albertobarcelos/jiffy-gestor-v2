import {
  PREVIEW_DESIGN_CATEGORIES,
  PREVIEW_DESIGN_PRODUTOS,
} from '../constants/previewCatalogMock'
import type { DesignCategoriaGrupo } from '../types/designCategoriaGrupo'
import type { DeliveryPublicoViewModel } from '../types/deliveryPublicoViewModel'

function buildMockGruposFromPreviewCatalog() {
  return PREVIEW_DESIGN_CATEGORIES.map(cat => ({
    id: cat.id,
    nome: cat.nome,
    iconName: cat.iconName,
    produtos: PREVIEW_DESIGN_PRODUTOS.filter(p => p.grupoId === cat.id).map(p => ({
      id: p.id,
      nome: p.nome,
      descricao: p.descricao ?? null,
      preco: p.preco,
      imagemUrl: null,
      grupoId: p.grupoId,
    })),
  }))
}

export function buildPreviewViewModelFromGrupos(
  grupos: DesignCategoriaGrupo[],
  overrides: Partial<DeliveryPublicoViewModel> = {}
): DeliveryPublicoViewModel {
  if (grupos.length === 0) {
    return buildMockDeliveryViewModel(overrides)
  }

  const viewGrupos = grupos.map((grupo, index) => ({
    id: grupo.id,
    nome: grupo.nome,
    iconName: grupo.iconName,
    imagemUrl: grupo.imagemUrl,
    produtos:
      index === 0
        ? [
            {
              id: 'preview-produto-exemplo',
              nome: 'Produto exemplo',
              descricao: 'Visualização no preview do design',
              preco: 10,
              imagemUrl: null,
              grupoId: grupo.id,
            },
          ]
        : [],
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
    horarioTexto: '00:00 às 23:59',
    tipoEntrega: 'entrega',
    termoBusca: '',
    carrinho: { total: 80, quantidadeItens: 8 },
    ...overrides,
  }
}
