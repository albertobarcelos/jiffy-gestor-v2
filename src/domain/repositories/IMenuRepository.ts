import type {
  CreateMenuInput,
  ImageUploadIntentInput,
  ImageUploadIntentResponse,
  Menu,
  MenuGrupoProduto,
  MenuProduto,
  UpdateMenuInput,
  UpdateMenuProdutoInput,
  UpdateMenuProdutosBatchInput,
} from '@/src/shared/types/menus'

export interface BuscarMenusParams {
  q?: string
  limit?: number
  offset?: number
  ativo?: boolean | null
  tipo?: string
}

export interface BuscarMenusResponse {
  items: Menu[]
  count: number
  page?: number
  limit?: number
  totalPages?: number
  hasNext?: boolean
  hasPrevious?: boolean
}

export interface BuscarMenuProdutosParams {
  q?: string
  limit?: number
  offset?: number
  ativo?: boolean | null
  favorito?: boolean | null
  grupoProdutoId?: string
  grupoComplementosId?: string
}

export interface BuscarMenuGruposParams {
  q?: string
  limit?: number
  offset?: number
  ativo?: boolean | null
  grupoProdutoId?: string
}

export interface IMenuRepository {
  listarMenus(params: BuscarMenusParams): Promise<BuscarMenusResponse>
  buscarMenuPorId(id: string): Promise<Menu>
  criarMenu(input: CreateMenuInput): Promise<Menu>
  atualizarMenu(id: string, input: UpdateMenuInput): Promise<Menu>
  excluirMenu(id: string): Promise<void>

  listarProdutos(
    menuId: string,
    params: BuscarMenuProdutosParams
  ): Promise<BuscarMenusResponse & { items: MenuProduto[] }>
  buscarProduto(menuId: string, produtoId: string): Promise<MenuProduto>
  atualizarProdutos(
    menuId: string,
    input: UpdateMenuProdutosBatchInput
  ): Promise<Menu>
  atualizarProduto(
    menuId: string,
    produtoId: string,
    input: UpdateMenuProdutoInput
  ): Promise<MenuProduto>
  reordenarProduto(
    menuId: string,
    produtoId: string,
    novaPosicao: number
  ): Promise<void>
  criarUploadIntentProduto(
    menuId: string,
    produtoId: string,
    input: ImageUploadIntentInput
  ): Promise<ImageUploadIntentResponse>

  listarGrupos(
    menuId: string,
    params: BuscarMenuGruposParams
  ): Promise<BuscarMenusResponse & { items: MenuGrupoProduto[] }>
  atualizarGrupo(
    menuId: string,
    grupoProdutoId: string,
    nome: string
  ): Promise<MenuGrupoProduto>
  reordenarGrupo(
    menuId: string,
    grupoProdutoId: string,
    novaPosicao: number
  ): Promise<void>
}
