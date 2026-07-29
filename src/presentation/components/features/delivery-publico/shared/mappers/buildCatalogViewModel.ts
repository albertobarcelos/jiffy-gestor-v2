import type { CatalogoPublicoGrupoProdutoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { listarProdutosFavoritos } from '@/src/presentation/hooks/usePublicDeliveryCatalog'
import { DELIVERY_PUBLICO_HORARIO_PLACEHOLDER } from '../constants/deliveryPublicoPlaceholders'
import {
  DELIVERY_PUBLICO_GRUPO_SUGESTOES_ICON,
  DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID,
  DELIVERY_PUBLICO_GRUPO_SUGESTOES_NOME,
} from '../constants/deliveryPublicoSugestoes'
import type {
  DeliveryPublicoGrupoViewModel,
  DeliveryPublicoViewModel,
} from '../types/deliveryPublicoViewModel'
import { produtoTemComplementosAtivos } from '../utils/produtoComplementosUtils'

function mapGrupoToViewModel(
  grupo: CatalogoPublicoGrupoProdutoDTO
): DeliveryPublicoGrupoViewModel {
  return {
    id: grupo.id,
    nome: grupo.nome,
    iconName: grupo.icone,
    cor: grupo.cor,
    imagemUrl: grupo.imagemUrl,
    produtos: grupo.produtos.map(produto => ({
      id: produto.id,
      nome: produto.nome,
      descricao: produto.descricao,
      preco: produto.valor,
      imagemUrl: produto.imagemUrl,
      grupoId: grupo.id,
      temComplementos: produtoTemComplementosAtivos(produto),
    })),
  }
}

function buildGrupoSugestoes(
  grupos: CatalogoPublicoGrupoProdutoDTO[]
): DeliveryPublicoGrupoViewModel | null {
  const favoritos = listarProdutosFavoritos(grupos)
  if (favoritos.length === 0) return null

  return {
    id: DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID,
    nome: DELIVERY_PUBLICO_GRUPO_SUGESTOES_NOME,
    iconName: DELIVERY_PUBLICO_GRUPO_SUGESTOES_ICON,
    cor: null,
    imagemUrl: null,
    produtos: favoritos.map(produto => ({
      id: produto.id,
      nome: produto.nome,
      descricao: produto.descricao,
      preco: produto.valor,
      imagemUrl: produto.imagemUrl,
      grupoId: produto.grupoId,
      temComplementos: produtoTemComplementosAtivos(produto),
    })),
  }
}

export function buildCatalogViewModel(
  grupos: CatalogoPublicoGrupoProdutoDTO[],
  overrides: Partial<DeliveryPublicoViewModel> = {}
): DeliveryPublicoViewModel {
  const gruposMapeados = grupos.map(mapGrupoToViewModel)
  const sugestoes = buildGrupoSugestoes(grupos)

  return {
    grupos: sugestoes ? [sugestoes, ...gruposMapeados] : gruposMapeados,
    disponivel: true,
    horarioTexto: DELIVERY_PUBLICO_HORARIO_PLACEHOLDER,
    termoBusca: '',
    carrinho: { total: 0, quantidadeItens: 0 },
    ...overrides,
  }
}
