import type { CatalogoPublicoGrupoProdutoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { listarProdutosFavoritos } from '@/src/presentation/hooks/usePublicDeliveryCatalog'
import { DELIVERY_PUBLICO_HORARIO_PLACEHOLDER } from '../constants/deliveryPublicoPlaceholders'
import {
  DELIVERY_PUBLICO_GRUPO_SUGESTOES_ICON,
  DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID,
  DELIVERY_PUBLICO_GRUPO_SUGESTOES_NOME,
  findGrupoSugestoesDaCasaCarrier,
  omitGrupoSugestoesDaCasaCarrier,
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
  grupos: CatalogoPublicoGrupoProdutoDTO[],
  imagemUrl: string | null
): DeliveryPublicoGrupoViewModel | null {
  const favoritos = listarProdutosFavoritos(grupos)
  if (favoritos.length === 0) return null

  return {
    id: DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID,
    nome: DELIVERY_PUBLICO_GRUPO_SUGESTOES_NOME,
    iconName: DELIVERY_PUBLICO_GRUPO_SUGESTOES_ICON,
    cor: null,
    imagemUrl,
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

/**
 * Monta o view-model do cardápio público.
 * Sugestões só entra se existir o grupo real "Sugestões da Casa" e houver favoritos.
 * O grupo real não aparece como seção normal — só como fonte da imagem.
 */
export function buildCatalogViewModel(
  grupos: CatalogoPublicoGrupoProdutoDTO[],
  overrides: Partial<DeliveryPublicoViewModel> = {}
): DeliveryPublicoViewModel {
  const carrier = findGrupoSugestoesDaCasaCarrier(grupos)
  const gruposVisiveis = omitGrupoSugestoesDaCasaCarrier(grupos)
  const gruposMapeados = gruposVisiveis.map(mapGrupoToViewModel)
  const sugestoes = carrier
    ? buildGrupoSugestoes(grupos, carrier.imagemUrl?.trim() || null)
    : null

  return {
    grupos: sugestoes ? [sugestoes, ...gruposMapeados] : gruposMapeados,
    disponivel: true,
    horarioTexto: DELIVERY_PUBLICO_HORARIO_PLACEHOLDER,
    horarioSemanalTexto: 'Horário não informado',
    termoBusca: '',
    carrinho: { total: 0, quantidadeItens: 0 },
    ...overrides,
  }
}
