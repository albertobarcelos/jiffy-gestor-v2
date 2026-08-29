import type { INovoPedidoReadRepository } from '@/src/domain/repositories/INovoPedidoReadRepository'
import { novoPedidoReadRepository } from '@/src/infrastructure/api/repositories/NovoPedidoReadRepository'

export class ListarProdutosDoGrupoUseCase {
  constructor(private readonly repo: INovoPedidoReadRepository = novoPedidoReadRepository) {}

  execute(grupoId: string, token: string, menuId: string | null) {
    return this.repo.listarProdutosDoGrupo(grupoId, token, menuId)
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

export const listarProdutosDoGrupoUseCase = new ListarProdutosDoGrupoUseCase()
export const listarGrupoIdsComProdutosAtivosMenuUseCase =
  new ListarGrupoIdsComProdutosAtivosMenuUseCase()
export const buscarProdutoCatalogoPorIdUseCase = new BuscarProdutoCatalogoPorIdUseCase()

/** @deprecated Use `listarGrupoIdsComProdutosAtivosMenuUseCase`. */
export const listarGrupoIdsComProdutosAtivosVendaUseCase = listarGrupoIdsComProdutosAtivosMenuUseCase
