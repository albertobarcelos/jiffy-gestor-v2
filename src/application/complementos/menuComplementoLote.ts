export type ComplementoResumoLote = {
  id: string
  nome: string
}

export type GrupoComplementoLote = {
  id: string
  nome: string
  produtos: number
  complementos: ComplementoResumoLote[]
}

export type ComplementoDoCardapioLote = {
  id: string
  nome: string
  grupos: number
}

export function compararNomePt(a: string, b: string): number {
  return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
}

/** Extrai id/nome dos complementos do payload do grupo (JSON ou entidade). */
export function lerComplementosResumoLote(raw: unknown): ComplementoResumoLote[] {
  if (!Array.isArray(raw)) return []
  const itens: ComplementoResumoLote[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const registro = item as Record<string, unknown>
    const id = registro.id != null ? String(registro.id) : ''
    const nome = registro.nome != null ? String(registro.nome) : ''
    if (id && nome) itens.push({ id, nome })
  }
  return itens.sort((a, b) => compararNomePt(a.nome, b.nome))
}

type ProdutoComGrupos = {
  produtoId: string
  gruposComplementos?: ReadonlyArray<{ id?: string; nome?: string } | null> | null
}

/**
 * Une os grupos de complementos presentes nos produtos do cardápio
 * e conta em quantos produtos cada grupo aparece.
 */
export function coletarGruposDosProdutosDoMenu(
  produtos: ReadonlyArray<ProdutoComGrupos>
): Map<string, { nome: string; produtos: Set<string> }> {
  const porId = new Map<string, { nome: string; produtos: Set<string> }>()
  for (const produto of produtos) {
    for (const grupo of produto.gruposComplementos ?? []) {
      if (!grupo?.id) continue
      const atual = porId.get(grupo.id) ?? {
        nome: grupo.nome || 'Grupo',
        produtos: new Set<string>(),
      }
      if (grupo.nome) atual.nome = grupo.nome
      atual.produtos.add(produto.produtoId)
      porId.set(grupo.id, atual)
    }
  }
  return porId
}

/** Complementos únicos do cardápio + em quantos grupos cada um aparece. */
export function listarComplementosDoCardapioLote(
  grupos: ReadonlyArray<GrupoComplementoLote>
): ComplementoDoCardapioLote[] {
  const porId = new Map<string, { nome: string; grupos: Set<string> }>()
  for (const grupo of grupos) {
    for (const complemento of grupo.complementos) {
      const atual = porId.get(complemento.id) ?? {
        nome: complemento.nome,
        grupos: new Set<string>(),
      }
      atual.grupos.add(grupo.id)
      porId.set(complemento.id, atual)
    }
  }
  return [...porId.entries()]
    .map(([id, item]) => ({ id, nome: item.nome, grupos: item.grupos.size }))
    .sort((a, b) => compararNomePt(a.nome, b.nome))
}
