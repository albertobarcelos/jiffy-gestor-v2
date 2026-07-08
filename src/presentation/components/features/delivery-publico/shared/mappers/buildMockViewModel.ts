import {
  PREVIEW_DESIGN_CATEGORIES,
  PREVIEW_DESIGN_PRODUTOS,
} from '../constants/previewCatalogMock'
import type { DeliveryPublicoViewModel } from '../types/deliveryPublicoViewModel'

export function buildMockDeliveryViewModel(
  overrides: Partial<DeliveryPublicoViewModel> = {}
): DeliveryPublicoViewModel {
  const grupos = PREVIEW_DESIGN_CATEGORIES.map(cat => ({
    id: cat.id,
    nome: cat.nome,
    produtos: PREVIEW_DESIGN_PRODUTOS.filter(p => p.grupoId === cat.id).map(p => ({
      id: p.id,
      nome: p.nome,
      descricao: p.descricao ?? null,
      preco: p.preco,
      imagemUrl: null,
      grupoId: p.grupoId,
    })),
  }))

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
