import { Produto } from '@/src/domain/entities/Produto'
import type { ProdutoPatch } from '@/src/shared/types/produto'

const collator = new Intl.Collator('pt-BR', { sensitivity: 'accent', numeric: false })

export const normalizeGroupName = (nome?: string) =>
  nome && nome.trim().length > 0 ? nome : 'Sem grupo'

/**
 * Chave estável para agrupar produtos na lista: um bucket por `grupoId`.
 * Não funde grupos distintos só porque o nome é igual — IDs diferentes ⇒ blocos separados.
 * Sem `grupoId`, agrupa por nome normalizado (comportamento legado para produtos órfãos).
 */
export const buildProdutoGroupKey = (p: Produto): string => {
  const gid = p.getGrupoId()?.trim()
  if (gid) return `gid:${gid}`
  return `sem_grupo:${normalizeGroupName(p.getNomeGrupo())}`
}

export const sortProdutosAlphabetically = (lista: Produto[]): Produto[] =>
  [...lista].sort((a, b) => {
    const grupoCompare = collator.compare(
      normalizeGroupName(a.getNomeGrupo()),
      normalizeGroupName(b.getNomeGrupo())
    )
    return grupoCompare !== 0 ? grupoCompare : collator.compare(a.getNome(), b.getNome())
  })

/** Ordenação dentro do mesmo grupo: campo `ordem` da API, depois nome. */
export const sortProdutosWithinGroup = (lista: Produto[]): Produto[] =>
  [...lista].sort((a, b) => {
    const oa = a.getOrdem()
    const ob = b.getOrdem()
    const na = typeof oa === 'number' && Number.isFinite(oa) ? oa : Number.MAX_SAFE_INTEGER
    const nb = typeof ob === 'number' && Number.isFinite(ob) ? ob : Number.MAX_SAFE_INTEGER
    if (na !== nb) return na - nb
    return collator.compare(a.getNome(), b.getNome())
  })

/**
 * Monta `Produto` a partir da resposta da API mantendo `ordem` do item já em cache
 * quando o payload não envia o campo (evita o produto ir para o fim da lista após salvar).
 */
export function produtoFromApiPreservandoOrdem(anterior: Produto, raw: unknown): Produto {
  const parsed = Produto.fromJSON(raw)
  const ordemApi = parsed.getOrdem()
  if (typeof ordemApi === 'number' && Number.isFinite(ordemApi)) {
    return parsed
  }
  const ordemAnt = anterior.getOrdem()
  if (typeof ordemAnt !== 'number' || !Number.isFinite(ordemAnt)) {
    return parsed
  }
  return Produto.create(
    parsed.getId(),
    parsed.getCodigoProduto(),
    parsed.getNome(),
    parsed.getValor(),
    parsed.isAtivo(),
    parsed.getNomeGrupo(),
    parsed.getGrupoId(),
    parsed.getEstoque(),
    parsed.isFavorito(),
    parsed.abreComplementosAtivo(),
    parsed.permiteAcrescimoAtivo(),
    parsed.permiteDescontoAtivo(),
    parsed.permiteAlterarPrecoAtivo(),
    parsed.incideTaxaAtivo(),
    ordemAnt,
    parsed.getGruposComplementos(),
    parsed.getImpressoras()
  )
}

export const cloneProdutoWithPatch = (produto: Produto, patch: ProdutoPatch): Produto =>
  Produto.create(
    produto.getId(),
    produto.getCodigoProduto(),
    produto.getNome(),
    patch.valor ?? produto.getValor(),
    patch.ativo ?? produto.isAtivo(),
    produto.getNomeGrupo(),
    produto.getGrupoId(),
    produto.getEstoque(),
    patch.favorito ?? produto.isFavorito(),
    patch.abreComplementos ?? produto.abreComplementosAtivo(),
    patch.permiteAcrescimo ?? produto.permiteAcrescimoAtivo(),
    patch.permiteDesconto ?? produto.permiteDescontoAtivo(),
    patch.permiteAlterarPreco ?? produto.permiteAlterarPrecoAtivo(),
    patch.incideTaxa ?? produto.incideTaxaAtivo(),
    produto.getOrdem(),
    produto.getGruposComplementos(),
    produto.getImpressoras()
  )

/**
 * Aplica um patch otimista em todas as páginas do cache infinito do React Query.
 * Retorna a mesma referência de página quando nenhum item foi alterado,
 * evitando invalidação desnecessária de componentes que dependem de uma página específica.
 */
export const applyPatchToInfinitePages = (
  oldData: any,
  produtoId: string,
  patch: ProdutoPatch
): any => {
  if (!oldData?.pages) return oldData
  return {
    ...oldData,
    pages: oldData.pages.map((page: any) => {
      let touched = false
      const produtos = page.produtos.map((p: Produto) => {
        if (p.getId() !== produtoId) return p
        touched = true
        return cloneProdutoWithPatch(p, patch)
      })
      return touched ? { ...page, produtos } : page
    }),
  }
}
