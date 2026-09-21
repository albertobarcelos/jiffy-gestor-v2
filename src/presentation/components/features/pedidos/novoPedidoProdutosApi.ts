import {
  buscarProdutoCatalogoPorIdUseCase,
  hidratarGruposComplementosCatalogoUseCase,
  limparCacheGruposComplementosCatalogoUseCase,
  listarGruposCatalogoVendaUseCase,
  listarProdutosCatalogoVendaPaginaUseCase,
} from '@/src/infrastructure/composition/pedidoUseCases'
import type { CanalVendaCatalogo } from '@/src/domain/repositories/INovoPedidoReadRepository'
import { Produto } from '@/src/domain/entities/Produto'

export type CanalVendaNovoPedido = CanalVendaCatalogo

export async function fetchGruposCatalogoVenda(menuId: string, token: string) {
  return listarGruposCatalogoVendaUseCase.execute(menuId, token)
}

export async function fetchProdutosCatalogoPagina(
  token: string,
  menuId: string,
  params: {
    grupoProdutoId?: string
    q?: string
    limit: number
    offset: number
  }
) {
  return listarProdutosCatalogoVendaPaginaUseCase.execute(token, menuId, params)
}

export async function fetchProdutoCatalogoPorId(
  produtoId: string,
  token: string,
  menuId?: string | null
) {
  return buscarProdutoCatalogoPorIdUseCase.execute(produtoId, token, menuId)
}

export async function fetchHidratacaoGruposComplementosCatalogo(
  produto: Produto,
  token: string
) {
  return hidratarGruposComplementosCatalogoUseCase.execute(produto, token)
}

export function limparCacheGruposComplementosCatalogoVenda() {
  limparCacheGruposComplementosCatalogoUseCase.execute()
}

export type { Produto }
