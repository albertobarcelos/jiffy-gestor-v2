/**
 * Tipos da feature Menus (snapshots de cardápio por menu).
 * Espelham os DTOs do backend `/api/v1/cardapio/menus`.
 */

export type MenuTipo = 'principal' | 'custom'

export interface Menu {
  id: string
  codigo: string
  nome: string
  descricao: string | null
  tipo: MenuTipo | string
  ativo: boolean
  empresaId: string
  dataCriacao: string
  dataAtualizacao: string
}

export interface MenuGrupoBase {
  id: string
  nome: string
  ativo?: boolean
  ordem?: number
  corHex?: string | null
  iconName?: string | null
  imagemUrl?: string | null
}

export interface MenuGrupoProduto {
  id: string
  nome: string
  ordem: number
  menuId: string
  grupoBase: MenuGrupoBase
  image?: MenuProdutoImage | null
  dataCriacao: string
  dataAtualizacao: string
}

export interface MenuProdutoGrupoResumo {
  id: string
  nome: string
  nomeBase?: string
}

export interface MenuProdutoImage {
  imageId: string
  imageUrl: string | null
}

export interface MenuProdutoComplementoResumo {
  id: string
  nome: string
}

export interface MenuProduto {
  id: string
  nome: string
  descricao: string | null
  valor: number
  ordem: number
  favorito: boolean
  ativo: boolean
  menu: { id: string; nome: string }
  produtoId: string
  grupoProduto: MenuProdutoGrupoResumo
  image: MenuProdutoImage | null
  gruposComplementos: MenuProdutoComplementoResumo[]
  dataCriacao: string
  dataAtualizacao: string
}

export interface PaginatedMenusResponse {
  success: boolean
  items: Menu[]
  count: number
  page?: number
  limit?: number
  totalPages?: number
  hasNext?: boolean
  hasPrevious?: boolean
}

export interface CreateMenuInput {
  nome: string
  descricao?: string | null
  codigo?: string
  tipo?: 'custom'
}

export interface UpdateMenuInput {
  nome?: string
  descricao?: string | null
  ativo?: boolean
}

export interface UpdateMenuProdutoInput {
  nome?: string
  descricao?: string | null
  valor?: number
  ordem?: number
  favorito?: boolean
  ativo?: boolean
  grupoProdutoId?: string
  gruposComplementosIds?: string[]
  imageId?: string | null
}

export interface UpdateMenuProdutosBatchInput {
  add?: string[]
  remove?: string[]
  update?: Array<{ produtoId: string } & UpdateMenuProdutoInput>
}

/** Resumo do menu no GET do produto (`menus: [{ id, nome }]`). */
export interface ProdutoMenuResumo {
  id: string
  nome: string
}

/** PATCH `/cardapio/produtos/{id}/menus` — remove é aplicado antes do add. */
export interface UpdateProdutoMenusInput {
  add?: string[]
  remove?: string[]
}

export interface ReorderInput {
  novaPosicao: number
}

export interface ImageUploadIntentInput {
  fileName: string
  mimeType: string
  sizeInBytes: number
}

export interface ImageUploadIntentResponse {
  uploadIntentId: string
  imageId: string
  storageKey: string
  uploadUrl: string
  expiresAt: string
}
