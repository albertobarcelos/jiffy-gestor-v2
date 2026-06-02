import {
  buscarProdutoCatalogoPorIdUseCase,
  listarGrupoIdsComProdutosAtivosVendaUseCase,
  listarProdutosDoGrupoUseCase,
} from '@/src/application/use-cases/vendas/ListarProdutosCatalogoUseCase'
import type { CanalVendaCatalogo } from '@/src/domain/repositories/INovoPedidoReadRepository'
import { Produto } from '@/src/domain/entities/Produto'
import { novoPedidoReadRepository } from '@/src/infrastructure/api/repositories/NovoPedidoReadRepository'

export type CanalVendaNovoPedido = CanalVendaCatalogo

export async function fetchProdutosDoGrupo(grupoId: string, token: string) {
  return listarProdutosDoGrupoUseCase.execute(grupoId, token)
}

export async function fetchGrupoIdsComProdutosAtivosVenda(
  token: string,
  canal: CanalVendaNovoPedido
) {
  return listarGrupoIdsComProdutosAtivosVendaUseCase.execute(token, canal)
}

export async function fetchProdutoCatalogoPorId(produtoId: string, token: string) {
  return buscarProdutoCatalogoPorIdUseCase.execute(produtoId, token)
}

/** Busca por nome via repositório BFF (uso em queries de catálogo). */
export async function fetchProdutosPorNomeBusca(nome: string, token: string) {
  return novoPedidoReadRepository.buscarProdutosPorNome(nome, token)
}

export type { Produto }
