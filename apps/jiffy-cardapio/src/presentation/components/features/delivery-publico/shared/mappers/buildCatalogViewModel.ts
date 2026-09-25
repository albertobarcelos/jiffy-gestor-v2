import type { CatalogoPublicoGrupoProdutoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import type { FuncionamentoPublicoDTO } from '@/src/application/dto/delivery/FuncionamentoDeliveryDTO'
import { listarProdutosFavoritos } from '@/src/presentation/hooks/usePublicDeliveryCatalog'
import {
  formatarHorarioFuncionamentoPublico,
  formatarStatusLojaPublica,
} from '@/src/shared/utils/funcionamentoDelivery'
import {
  DELIVERY_PUBLICO_GRUPO_SUGESTOES_ICON,
  DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID,
  DELIVERY_PUBLICO_GRUPO_SUGESTOES_NOME,
} from '../constants/deliveryPublicoSugestoes'
import type {
  DeliveryPublicoGrupoViewModel,
  DeliveryPublicoProdutoViewModel,
  DeliveryPublicoViewModel,
} from '../types/deliveryPublicoViewModel'
import { produtoTemComplementosAtivos } from '../utils/produtoComplementosUtils'
import { resolverPrecosDeliveryProduto } from '../utils/resolverPrecosDeliveryProduto'

function mapProdutoToViewModel(
  produto: CatalogoPublicoGrupoProdutoDTO['produtos'][number],
  grupoId: string
): DeliveryPublicoProdutoViewModel {
  const precos = resolverPrecosDeliveryProduto({
    valor: produto.valor,
    valorPromocional: produto.valorPromocional,
    valorVigente: produto.valorVigente,
    promocaoAtiva: produto.promocaoAtiva,
  })

  return {
    id: produto.id,
    nome: produto.nome,
    descricao: produto.descricao,
    preco: precos.preco,
    precoRegular: precos.precoRegular,
    descontoPercentual: precos.descontoPercentual,
    imagemUrl: produto.imagemUrl,
    grupoId,
    temComplementos: produtoTemComplementosAtivos(produto),
  }
}

function mapGrupoToViewModel(
  grupo: CatalogoPublicoGrupoProdutoDTO
): DeliveryPublicoGrupoViewModel {
  return {
    id: grupo.id,
    nome: grupo.nome,
    iconName: grupo.icone,
    cor: grupo.cor,
    imagemUrl: grupo.imagemUrl,
    produtos: grupo.produtos.map(produto => mapProdutoToViewModel(produto, grupo.id)),
  }
}

/** Carrossel sintético com favoritos do menu; null se não houver nenhum. */
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
    produtos: favoritos.map(produto => mapProdutoToViewModel(produto, produto.grupoId)),
  }
}

/**
 * Monta o view-model do cardápio público.
 * Sugestões = carrossel dos favoritos do menu; omitido quando não há favoritos.
 */
export function buildCatalogViewModel(
  grupos: CatalogoPublicoGrupoProdutoDTO[],
  overrides: Partial<DeliveryPublicoViewModel> = {},
  funcionamento?: FuncionamentoPublicoDTO | null
): DeliveryPublicoViewModel {
  const gruposMapeados = grupos.map(mapGrupoToViewModel)
  const sugestoes = buildGrupoSugestoes(grupos)

  const status = funcionamento
    ? formatarStatusLojaPublica(funcionamento)
    : { mensagem: 'Aberto, faça seu pedido!', detalheHorario: null }

  return {
    grupos: sugestoes ? [sugestoes, ...gruposMapeados] : gruposMapeados,
    disponivel: funcionamento?.aberta ?? true,
    horarioTexto: funcionamento
      ? formatarHorarioFuncionamentoPublico(funcionamento)
      : 'Consulte os horários',
    statusMensagem: status.mensagem,
    statusDetalheHorario: status.detalheHorario,
    termoBusca: '',
    carrinho: { total: 0, quantidadeItens: 0 },
    ...overrides,
  }
}
