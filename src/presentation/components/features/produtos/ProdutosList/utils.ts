import { Produto } from '@/src/domain/entities/Produto'
import type { ProdutoPatch } from '@/src/shared/types/produto'

const collator = new Intl.Collator('pt-BR', { sensitivity: 'accent', numeric: false })

/** Lista sequencial: ordenação alfabética por nome do produto. */
export const sortProdutosAlphabetically = (lista: Produto[]): Produto[] =>
  [...lista].sort((a, b) => collator.compare(a.getNome(), b.getNome()))

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
    parsed.getImpressoras(),
    parsed.getNcm(),
    parsed.getCest(),
    parsed.getOrigemMercadoria(),
    parsed.getTipoProduto(),
    parsed.getIndicadorProducaoEscala(),
    parsed.getUnidadeMedida(),
    parsed.getMenus()
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
    produto.getImpressoras(),
    produto.getNcm(),
    produto.getCest(),
    produto.getOrigemMercadoria(),
    produto.getTipoProduto(),
    produto.getIndicadorProducaoEscala(),
    produto.getUnidadeMedida(),
    produto.getMenus()
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
