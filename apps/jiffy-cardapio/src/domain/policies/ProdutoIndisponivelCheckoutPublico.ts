/**
 * Policy: item do carrinho público que não pode mais ser cotado/vendido
 * (pausado no menu, soft delete ou produto base inativo — mensagens da API).
 */

export type ItemCarrinhoProdutoRef = {
  produtoId: string
  produtoNome: string
}

export type ProdutoIndisponivelCarrinho = {
  produtoIds: string[]
  nomes: string[]
}

/** Mensagens de cotação/pedido quando o item do carrinho não pode mais ser vendido. */
export function isErroProdutoIndisponivelCheckout(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('não está ativo') ||
    m.includes('nao esta ativo') ||
    m.includes('não encontrado no menu') ||
    m.includes('nao encontrado no menu')
  )
}

/**
 * Identifica produtos do carrinho citados no erro da API
 * (pausado no menu, soft delete ou base inativo).
 */
export function resolverProdutoIndisponivelDoErro(
  message: string,
  produtos: ReadonlyArray<ItemCarrinhoProdutoRef>
): ProdutoIndisponivelCarrinho | null {
  if (!isErroProdutoIndisponivelCheckout(message) || produtos.length === 0) {
    return null
  }

  const porId = new Map<string, string>()
  for (const p of produtos) {
    const id = p.produtoId.trim()
    const nome = p.produtoNome.trim()
    if (id) porId.set(id, nome || id)
  }

  const idsEncontrados: string[] = []
  for (const id of [...porId.keys()].sort((a, b) => b.length - a.length)) {
    if (message.includes(id)) idsEncontrados.push(id)
  }

  if (idsEncontrados.length === 0) {
    for (const [id, nome] of porId) {
      if (nome && message.includes(nome)) idsEncontrados.push(id)
    }
  }

  if (idsEncontrados.length === 0) {
    const match =
      message.match(/Produto não está ativo(?: no menu)?:\s*(.+)$/i) ??
      message.match(/Produto\s+(.+?)\s+n[aã]o encontrado no menu/i)
    const token = match?.[1]?.trim()
    if (token) {
      for (const [id, nome] of porId) {
        if (id === token || nome === token) idsEncontrados.push(id)
      }
      if (idsEncontrados.length === 0) {
        return { produtoIds: [], nomes: [token] }
      }
    }
  }

  if (idsEncontrados.length === 0) return null

  const unicos = [...new Set(idsEncontrados)]
  return {
    produtoIds: unicos,
    nomes: unicos.map(id => porId.get(id) ?? id),
  }
}

/**
 * Itens do carrinho cujo produtoId não está no conjunto de IDs do catálogo público
 * (pausado no menu ou soft delete — some da listagem).
 */
export function resolverProdutosAusentesDoCatalogo(
  itens: ReadonlyArray<ItemCarrinhoProdutoRef>,
  idsDisponiveisNoCatalogo: ReadonlySet<string>
): ProdutoIndisponivelCarrinho | null {
  if (itens.length === 0 || idsDisponiveisNoCatalogo.size === 0) return null

  const vistos = new Set<string>()
  const produtoIds: string[] = []
  const nomes: string[] = []

  for (const item of itens) {
    const id = item.produtoId.trim()
    if (!id || vistos.has(id)) continue
    if (idsDisponiveisNoCatalogo.has(id)) continue
    vistos.add(id)
    produtoIds.push(id)
    nomes.push(item.produtoNome.trim() || id)
  }

  if (produtoIds.length === 0) return null
  return { produtoIds, nomes }
}
