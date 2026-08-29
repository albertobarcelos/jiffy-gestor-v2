import { menuBffRepository } from '@/src/infrastructure/api/repositories/MenuBffRepository'
import type {
  CreateMenuInput,
  UpdateMenuInput,
  UpdateMenuProdutoInput,
  UpdateMenuProdutosBatchInput,
} from '@/src/shared/types/menus'
import type { MenuProdutoCatalogTipoFiltro } from '@/src/infrastructure/api/repositories/menuCatalogFetch'

type TokenInput = { token: string }

export class ListarMenusViaBffUseCase {
  execute(
    input: TokenInput & {
      q?: string
      ativo?: boolean | null
      tipo?: string
      limit?: number
      offset?: number
    }
  ) {
    return menuBffRepository.listarMenus(input.token, input)
  }
}

export class BuscarMenuViaBffUseCase {
  execute(input: TokenInput & { menuId: string }) {
    return menuBffRepository.buscarMenuPorId(input.token, input.menuId)
  }
}

export class CriarMenuViaBffUseCase {
  execute(input: TokenInput & { data: CreateMenuInput }) {
    return menuBffRepository.criarMenu(input.token, input.data)
  }
}

export class AtualizarMenuViaBffUseCase {
  execute(input: TokenInput & { menuId: string; data: UpdateMenuInput }) {
    return menuBffRepository.atualizarMenu(input.token, input.menuId, input.data)
  }
}

export class ExcluirMenuViaBffUseCase {
  execute(input: TokenInput & { menuId: string }) {
    return menuBffRepository.excluirMenu(input.token, input.menuId)
  }
}

export class BuscarMenuProdutoViaBffUseCase {
  execute(input: TokenInput & { menuId: string; produtoId: string }) {
    return menuBffRepository.buscarProduto(input.token, input.menuId, input.produtoId)
  }
}

export class ListarMenuProdutosViaBffUseCase {
  execute(
    input: TokenInput & {
      menuId: string
      q?: string
      grupoProdutoId?: string
      grupoComplementosId?: string
      ativo?: boolean | null
      favorito?: boolean | null
      tipo?: MenuProdutoCatalogTipoFiltro
      limit?: number
      offset?: number
    }
  ) {
    const { token, menuId, ...params } = input
    return menuBffRepository.listarProdutos(token, menuId, params)
  }
}

export class AtualizarMenuProdutosBatchViaBffUseCase {
  execute(input: TokenInput & { menuId: string; data: UpdateMenuProdutosBatchInput }) {
    return menuBffRepository.atualizarProdutos(input.token, input.menuId, input.data)
  }
}

export class AtualizarMenuProdutoViaBffUseCase {
  execute(
    input: TokenInput & {
      menuId: string
      produtoId: string
      data: UpdateMenuProdutoInput
    }
  ) {
    return menuBffRepository.atualizarProduto(
      input.token,
      input.menuId,
      input.produtoId,
      input.data
    )
  }
}

export class ReordenarMenuProdutoViaBffUseCase {
  execute(
    input: TokenInput & { menuId: string; produtoId: string; novaPosicao: number }
  ) {
    return menuBffRepository.reordenarProduto(
      input.token,
      input.menuId,
      input.produtoId,
      input.novaPosicao
    )
  }
}

export class UploadImagemMenuProdutoViaBffUseCase {
  execute(input: TokenInput & { menuId: string; produtoId: string; file: File }) {
    return menuBffRepository.uploadImagemProduto(
      input.token,
      input.menuId,
      input.produtoId,
      input.file
    )
  }
}

export class ListarMenuGruposViaBffUseCase {
  execute(
    input: TokenInput & {
      menuId: string
      q?: string
      limit?: number
      offset?: number
    }
  ) {
    const { token, menuId, ...params } = input
    return menuBffRepository.listarGrupos(token, menuId, params)
  }
}

export class RenomearMenuGrupoViaBffUseCase {
  execute(
    input: TokenInput & { menuId: string; grupoProdutoId: string; nome: string }
  ) {
    return menuBffRepository.renomearGrupo(
      input.token,
      input.menuId,
      input.grupoProdutoId,
      input.nome
    )
  }
}

export class ReordenarMenuGrupoViaBffUseCase {
  execute(
    input: TokenInput & { menuId: string; grupoProdutoId: string; novaPosicao: number }
  ) {
    return menuBffRepository.reordenarGrupo(
      input.token,
      input.menuId,
      input.grupoProdutoId,
      input.novaPosicao
    )
  }
}

export const listarMenusViaBffUseCase = new ListarMenusViaBffUseCase()
export const buscarMenuViaBffUseCase = new BuscarMenuViaBffUseCase()
export const criarMenuViaBffUseCase = new CriarMenuViaBffUseCase()
export const atualizarMenuViaBffUseCase = new AtualizarMenuViaBffUseCase()
export const excluirMenuViaBffUseCase = new ExcluirMenuViaBffUseCase()
export const buscarMenuProdutoViaBffUseCase = new BuscarMenuProdutoViaBffUseCase()
export const listarMenuProdutosViaBffUseCase = new ListarMenuProdutosViaBffUseCase()
export const atualizarMenuProdutosBatchViaBffUseCase = new AtualizarMenuProdutosBatchViaBffUseCase()
export const atualizarMenuProdutoViaBffUseCase = new AtualizarMenuProdutoViaBffUseCase()
export const reordenarMenuProdutoViaBffUseCase = new ReordenarMenuProdutoViaBffUseCase()
export const uploadImagemMenuProdutoViaBffUseCase = new UploadImagemMenuProdutoViaBffUseCase()
export const listarMenuGruposViaBffUseCase = new ListarMenuGruposViaBffUseCase()
export const renomearMenuGrupoViaBffUseCase = new RenomearMenuGrupoViaBffUseCase()
export const reordenarMenuGrupoViaBffUseCase = new ReordenarMenuGrupoViaBffUseCase()
