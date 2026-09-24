import type { INovoPedidoReadRepository } from '@/src/domain/repositories/INovoPedidoReadRepository'
import type { Produto } from '@/src/domain/entities/Produto'

export class ListarGruposCatalogoVendaUseCase {
  constructor(private readonly repo: INovoPedidoReadRepository) {}

  execute(menuId: string, token: string) {
    return this.repo.listarGruposDoMenu(menuId, token)
  }
}

export class ListarProdutosCatalogoVendaPaginaUseCase {
  constructor(private readonly repo: INovoPedidoReadRepository) {}

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

export class BuscarProdutoCatalogoPorIdUseCase {
  constructor(private readonly repo: INovoPedidoReadRepository) {}

  execute(produtoId: string, token: string, menuId?: string | null) {
    return this.repo.buscarProdutoPorId(produtoId, token, menuId)
  }
}

/** GET só do cadastro base (NCM/CEST), sem snapshot do menu. */
export class BuscarFiscalCadastroProdutoUseCase {
  constructor(private readonly repo: INovoPedidoReadRepository) {}

  execute(produtoId: string, token: string) {
    return this.repo.buscarFiscalCadastroProdutoPorId(produtoId, token)
  }
}

export class HidratarGruposComplementosCatalogoUseCase {
  constructor(private readonly repo: INovoPedidoReadRepository) {}

  execute(produto: Produto, token: string) {
    return this.repo.hidratarGruposComplementosDoProduto(produto, token)
  }
}
