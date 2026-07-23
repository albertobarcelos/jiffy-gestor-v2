import {
  PREVIEW_DESIGN_CATEGORIES,
  PREVIEW_DESIGN_PRODUTOS,
  previewGrupoFallbackImagemUrl,
} from '../constants/previewCatalogMock'
import type { DesignCategoriaGrupo } from '../types/designCategoriaGrupo'
import type {
  DeliveryPublicoGrupoViewModel,
  DeliveryPublicoViewModel,
} from '../types/deliveryPublicoViewModel'

function previewProdutoExemplo(grupoId: string) {
  return {
    id: `preview-produto-${grupoId}`,
    nome: 'Produto exemplo',
    descricao: 'Visualização no preview do design',
    preco: 10,
    imagemUrl: null as string | null,
    grupoId,
  }
}

function buildMockGruposFromPreviewCatalog(): DeliveryPublicoGrupoViewModel[] {
  return PREVIEW_DESIGN_CATEGORIES.map(cat => {
    const produtos = PREVIEW_DESIGN_PRODUTOS.filter(p => p.grupoId === cat.id).map(p => ({
      id: p.id,
      nome: p.nome,
      descricao: p.descricao ?? null,
      preco: p.preco,
      imagemUrl: null as string | null,
      grupoId: p.grupoId,
    }))

    return {
      id: cat.id,
      nome: cat.nome,
      iconName: cat.iconName,
      // Mock sem API: placeholder neutro (não colorido).
      imagemUrl: previewGrupoFallbackImagemUrl(cat.id),
      // Garante barra de grupo no layout básico (DeliverySecaoGrupo ignora grupos sem produtos).
      produtos: produtos.length > 0 ? produtos : [previewProdutoExemplo(cat.id)],
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
    produtos: [previewProdutoExemplo(grupo.id)],
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
    horarioTexto: '09:00 às 23:30',
    termoBusca: '',
    carrinho: { total: 80, quantidadeItens: 8 },
    ...overrides,
  }
}
