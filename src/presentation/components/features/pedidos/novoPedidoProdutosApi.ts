import {
  buscarProdutoCatalogoPorIdUseCase,
  listarGrupoIdsComProdutosAtivosMenuUseCase,
  listarProdutosDoGrupoUseCase,
} from '@/src/application/use-cases/vendas/ListarProdutosCatalogoUseCase'
import type { CanalVendaCatalogo } from '@/src/domain/repositories/INovoPedidoReadRepository'
import { Produto } from '@/src/domain/entities/Produto'
import { novoPedidoReadRepository } from '@/src/infrastructure/api/repositories/NovoPedidoReadRepository'

export type CanalVendaNovoPedido = CanalVendaCatalogo

export async function fetchProdutosDoGrupo(
  grupoId: string,
  token: string,
  menuId: string | null
) {
  return listarProdutosDoGrupoUseCase.execute(grupoId, token, menuId)
}

export async function fetchGrupoIdsComProdutosAtivosMenu(
  token: string,
  menuId: string | null
) {
  return listarGrupoIdsComProdutosAtivosMenuUseCase.execute(token, menuId)
}

export async function fetchProdutoCatalogoPorId(
  produtoId: string,
  token: string,
  menuId?: string | null
) {
  return buscarProdutoCatalogoPorIdUseCase.execute(produtoId, token, menuId)
}

/** Busca por nome no menu configurado para o fluxo de venda. */
export async function fetchProdutosPorNomeBusca(
  nome: string,
  token: string,
  menuId: string | null
) {
  return novoPedidoReadRepository.buscarProdutosPorNome(nome, token, menuId)
}

export type { Produto }
