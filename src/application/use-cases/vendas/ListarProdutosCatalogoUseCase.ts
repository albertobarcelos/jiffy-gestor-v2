import type {
  CanalVendaCatalogo,
  INovoPedidoReadRepository,
} from '@/src/domain/repositories/INovoPedidoReadRepository'
import { novoPedidoReadRepository } from '@/src/infrastructure/api/repositories/NovoPedidoReadRepository'

export class ListarProdutosDoGrupoUseCase {
  constructor(private readonly repo: INovoPedidoReadRepository = novoPedidoReadRepository) {}

  execute(grupoId: string, token: string) {
    return this.repo.listarProdutosDoGrupo(grupoId, token)
  }
}

export class ListarGrupoIdsComProdutosAtivosVendaUseCase {
  constructor(private readonly repo: INovoPedidoReadRepository = novoPedidoReadRepository) {}

  execute(token: string, canal: CanalVendaCatalogo) {
    return this.repo.listarGrupoIdsComProdutosAtivos(token, canal)
  }
}

export class BuscarProdutoCatalogoPorIdUseCase {
  constructor(private readonly repo: INovoPedidoReadRepository = novoPedidoReadRepository) {}

  execute(produtoId: string, token: string) {
    return this.repo.buscarProdutoPorId(produtoId, token)
  }
}

export const listarProdutosDoGrupoUseCase = new ListarProdutosDoGrupoUseCase()
export const listarGrupoIdsComProdutosAtivosVendaUseCase =
  new ListarGrupoIdsComProdutosAtivosVendaUseCase()
export const buscarProdutoCatalogoPorIdUseCase = new BuscarProdutoCatalogoPorIdUseCase()
