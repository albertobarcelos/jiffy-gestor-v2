import type { MenuProduto, UpdateMenuProdutoInput } from '@/src/shared/types/menus'

/** Campos de permissão do PDV. Hoje vivem no cadastro; o snapshot do menu ainda não os persiste. */
export const MENU_PRODUTO_PERMISSAO_FIELDS = [
  'permiteAcrescimo',
  'permiteDesconto',
  'abreComplementos',
  'permiteAlterarPreco',
  'incideTaxa',
] as const

export type MenuProdutoPermissaoField = (typeof MENU_PRODUTO_PERMISSAO_FIELDS)[number]

export type MenuProdutoPermissoes = Record<MenuProdutoPermissaoField, boolean>

/**
 * Quando o backend aceitar estes campos em `PATCH /menus/:id/produtos/:produtoId`,
 * ligue este flag para gravar no snapshot em vez do cadastro base.
 */
export const PERMISSOES_GRAVAM_NO_SNAPSHOT_MENU = false

export function permissoesMenuVazias(): MenuProdutoPermissoes {
  return {
    permiteAcrescimo: false,
    permiteDesconto: false,
    abreComplementos: false,
    permiteAlterarPreco: false,
    incideTaxa: false,
  }
}

function boolDoSnapshot(
  snapshot: MenuProduto,
  field: MenuProdutoPermissaoField
): boolean | undefined {
  const value = snapshot[field]
  return typeof value === 'boolean' ? value : undefined
}

/**
 * Prefere o snapshot do menu; se a API ainda não mandar o campo, usa o cadastro.
 */
export function resolverPermissoesMenuProduto(
  snapshot: MenuProduto,
  cadastro?: Partial<MenuProdutoPermissoes> | null
): MenuProdutoPermissoes {
  const base = { ...permissoesMenuVazias(), ...cadastro }
  const out = { ...base }
  for (const field of MENU_PRODUTO_PERMISSAO_FIELDS) {
    const doMenu = boolDoSnapshot(snapshot, field)
    if (typeof doMenu === 'boolean') out[field] = doMenu
  }
  return out
}

/** Remove permissões do PATCH do menu enquanto a API `.strict()` ainda as rejeita. */
export function sanitizarPatchMenuProduto(
  input: UpdateMenuProdutoInput
): UpdateMenuProdutoInput {
  if (PERMISSOES_GRAVAM_NO_SNAPSHOT_MENU) return input
  const out = { ...input }
  for (const field of MENU_PRODUTO_PERMISSAO_FIELDS) {
    delete out[field]
  }
  return out
}

export function boolFlagProduto(value: unknown): boolean {
  return value === true || value === 'true'
}

export type CatalogoProdutoListaIndex = {
  codigos: Record<string, string>
  permissoes: Record<string, MenuProdutoPermissoes>
}

export function aplicarTogglePermissaoNoIndex(
  index: CatalogoProdutoListaIndex | undefined,
  produtoId: string,
  field: MenuProdutoPermissaoField,
  value: boolean
): CatalogoProdutoListaIndex | undefined {
  if (!index) return index
  const atual = index.permissoes[produtoId] ?? permissoesMenuVazias()
  return {
    ...index,
    permissoes: {
      ...index.permissoes,
      [produtoId]: { ...atual, [field]: value },
    },
  }
}
