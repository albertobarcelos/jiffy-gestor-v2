import type { INovoPedidoReadRepository } from '@/src/domain/repositories/INovoPedidoReadRepository'
import { novoPedidoReadRepository } from '@/src/infrastructure/api/repositories/NovoPedidoReadRepository'

export class ListarProdutosDoGrupoUseCase {
  constructor(private readonly repo: INovoPedidoReadRepository = novoPedidoReadRepository) {}

  execute(grupoId: string, token: string, menuId: string | null) {
    return this.repo.listarProdutosDoGrupo(grupoId, token, menuId)
  }
}

export class ListarGruposCatalogoVendaUseCase {
  constructor(private readonly repo: INovoPedidoReadRepository = novoPedidoReadRepository) {}

  execute(menuId: string, token: string) {
    return this.repo.listarGruposDoMenu(menuId, token)
  }
}

export class ListarProdutosCatalogoVendaPaginaUseCase {
  constructor(private readonly repo: INovoPedidoReadRepository = novoPedidoReadRepository) {}

  execute(
    token: string,
    menuId: string,
    params: {
      grupoProdutoId?: string
      q?: string
      limit: number
      offset: number
    }
  ) {
    return this.repo.listarProdutosCatalogoPagina(token, menuId, params)
  }
}

export class ListarGrupoIdsComProdutosAtivosMenuUseCase {
  constructor(private readonly repo: INovoPedidoReadRepository = novoPedidoReadRepository) {}

  execute(token: string, menuId: string | null) {
    return this.repo.listarGrupoIdsComProdutosAtivos(token, menuId)
  }
}

export class BuscarProdutoCatalogoPorIdUseCase {
  constructor(private readonly repo: INovoPedidoReadRepository = novoPedidoReadRepository) {}

  execute(produtoId: string, token: string, menuId?: string | null) {
    return this.repo.buscarProdutoPorId(produtoId, token, menuId)
  }
}

export class BuscarProdutosCatalogoPorNomeUseCase {
  constructor(private readonly repo: INovoPedidoReadRepository = novoPedidoReadRepository) {}

  execute(nome: string, token: string, menuId: string | null) {
    return this.repo.buscarProdutosPorNome(nome, token, menuId)
  }
}

export const listarProdutosDoGrupoUseCase = new ListarProdutosDoGrupoUseCase()
export const listarProdutosCatalogoVendaPaginaUseCase = new ListarProdutosCatalogoVendaPaginaUseCase()
export const listarGruposCatalogoVendaUseCase = new ListarGruposCatalogoVendaUseCase()
export const listarGrupoIdsComProdutosAtivosMenuUseCase =
  new ListarGrupoIdsComProdutosAtivosMenuUseCase()
export const buscarProdutoCatalogoPorIdUseCase = new BuscarProdutoCatalogoPorIdUseCase()
export const buscarProdutosCatalogoPorNomeUseCase = new BuscarProdutosCatalogoPorNomeUseCase()

/** @deprecated Use `listarGrupoIdsComProdutosAtivosMenuUseCase`. */
export const listarGrupoIdsComProdutosAtivosVendaUseCase = listarGrupoIdsComProdutosAtivosMenuUseCase
