import { Produto } from '@/src/domain/entities/Produto'
import type { ProdutoPatch } from '@/src/shared/types/produto'

const collator = new Intl.Collator('pt-BR', { sensitivity: 'accent', numeric: false })

export const normalizeGroupName = (nome?: string) =>
  nome && nome.trim().length > 0 ? nome : 'Sem grupo'

export const sortProdutosAlphabetically = (lista: Produto[]): Produto[] =>
  [...lista].sort((a, b) => {
    const grupoCompare = collator.compare(
      normalizeGroupName(a.getNomeGrupo()),
      normalizeGroupName(b.getNomeGrupo())
    )
    return grupoCompare !== 0 ? grupoCompare : collator.compare(a.getNome(), b.getNome())
  })

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
    produto.getGruposComplementos(),
    produto.getImpressoras()
  )

/**
 * Aplica um patch otimista em todas as páginas do cache infinito do React Query.
 */
export const applyPatchToInfinitePages = (
  oldData: any,
  produtoId: string,
  patch: ProdutoPatch
): any => {
  if (!oldData?.pages) return oldData
  return {
    ...oldData,
    pages: oldData.pages.map((page: any) => ({
      ...page,
      produtos: page.produtos.map((p: Produto) =>
        p.getId() === produtoId ? cloneProdutoWithPatch(p, patch) : p
      ),
    })),
  }
}
