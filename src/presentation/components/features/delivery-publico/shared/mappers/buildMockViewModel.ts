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
  const suffix = index > 0 ? ` ${index + 1}` : ''
  return {
    id: `preview-produto-${grupoId}-${index + 1}`,
    nome: `Produto exemplo${suffix}`,
    descricao: 'Visualização no preview do design',
    preco: 10 + index * 2,
    imagemUrl: null as string | null,
    grupoId,
    temComplementos: false,
  }
}

/** No mínimo 3 itens por prateleira — deixa a rolagem horizontal óbvia no preview. */
function previewProdutosPrateleira(grupoId: string, count = 3) {
  return Array.from({ length: count }, (_, index) =>
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
      imagemUrl: null as string | null,
      grupoId: p.grupoId,
      temComplementos: false,
    }))

    return {
      id: cat.id,
      nome: cat.nome,
      iconName: cat.iconName,
      // Mock sem API: placeholder neutro (não colorido).
      imagemUrl: previewGrupoFallbackImagemUrl(cat.id),
      // Garante barra de grupo no layout básico (DeliverySecaoGrupo ignora grupos sem produtos).
      produtos:
        produtos.length >= 3
          ? produtos
          : [
              ...produtos,
              ...previewProdutosPrateleira(cat.id, 3 - produtos.length).map((p, i) => ({
                ...p,
                id: `${p.id}-pad-${i}`,
              })),
            ],
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
    produtos: previewProdutosPrateleira(grupo.id, 3),
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
    horarioSemanalTexto: 'Seg–Dom 00:00–23:59',
    termoBusca: '',
    carrinho: { total: 80, quantidadeItens: 8 },
    ...overrides,
  }
}
