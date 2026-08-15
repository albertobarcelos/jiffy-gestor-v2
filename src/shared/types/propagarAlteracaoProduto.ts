/** Campos comuns ao PATCH do cadastro (`/produtos/:id`) e ao snapshot (`/menus/:id/produtos/:produtoId`). */
export type SnapshotProdutoPropagavel = {
  nome?: string
  descricao?: string | null
  valor?: number
  ativo?: boolean
  favorito?: boolean
}

export type OrigemAlteracaoProduto = 'cadastroBase' | 'menu'

export type DestinoAlteracaoProduto = {
  aplicarNoCadastroBase: boolean
  menuIds: string[]
}

export type MenuAlvoPropagacao = {
  id: string
  nome: string
}

export function snapshotPropagavelDePatch(
  patch: Record<string, unknown>
): SnapshotProdutoPropagavel | null {
  const out: SnapshotProdutoPropagavel = {}
  if (typeof patch.nome === 'string' && patch.nome.trim() !== '') {
    out.nome = patch.nome.trim()
  }
  if ('descricao' in patch) {
    const d = patch.descricao
    out.descricao = typeof d === 'string' ? d : null
  }
  if (typeof patch.valor === 'number' && Number.isFinite(patch.valor)) {
    out.valor = patch.valor
  }
  if (typeof patch.ativo === 'boolean') out.ativo = patch.ativo
  if (typeof patch.favorito === 'boolean') out.favorito = patch.favorito
  return Object.keys(out).length > 0 ? out : null
}

export function destinosAlteracaoVazios(d: DestinoAlteracaoProduto): boolean {
  return !d.aplicarNoCadastroBase && d.menuIds.length === 0
}
