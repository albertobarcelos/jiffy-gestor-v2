import type { InfiniteData } from '@tanstack/react-query'
import { Produto } from '@/src/domain/entities/Produto'
import type { FiscalColunaGridId } from '../types'

export type ProdutosLoteInfinitePage = { list: Produto[]; count: number | null }

/** Clona produto aplicando um único campo fiscal (edição inline). */
export function cloneProdutoComCampoFiscal(
  produto: Produto,
  coluna: FiscalColunaGridId,
  valorNormalizado: string | null
): Produto {
  const ncm = coluna === 'ncm' ? (valorNormalizado ?? '') : produto.getNcm()
  const cest = coluna === 'cest' ? (valorNormalizado ?? '') : produto.getCest()
  const origem =
    coluna === 'origem' ? (valorNormalizado ?? '') : produto.getOrigemMercadoria()
  const tipo = coluna === 'tipo' ? (valorNormalizado ?? '') : produto.getTipoProduto()
  const indicador =
    coluna === 'indicador' ? valorNormalizado : produto.getIndicadorProducaoEscala()

  return Produto.create(
    produto.getId(),
    produto.getCodigoProduto(),
    produto.getNome(),
    produto.getValor(),
    produto.isAtivo(),
    produto.getNomeGrupo(),
    produto.getGrupoId(),
    produto.getEstoque(),
    produto.isFavorito(),
    produto.abreComplementosAtivo(),
    produto.permiteAcrescimoAtivo(),
    produto.permiteDescontoAtivo(),
    produto.permiteAlterarPrecoAtivo(),
    produto.incideTaxaAtivo(),
    produto.getOrdem(),
    produto.getGruposComplementos(),
    produto.getImpressoras(),
    ncm,
    cest,
    origem,
    tipo,
    indicador,
    produto.getUnidadeMedida()
  )
}

/** Atualiza um produto no cache infinito sem refetch da listagem. */
export function applyFiscalPatchToProdutosLoteInfinite(
  oldData: InfiniteData<ProdutosLoteInfinitePage> | undefined,
  produtoId: string,
  coluna: FiscalColunaGridId,
  valorNormalizado: string | null
): InfiniteData<ProdutosLoteInfinitePage> | undefined {
  if (!oldData?.pages.length) return oldData

  return {
    ...oldData,
    pages: oldData.pages.map((page) => {
      let touched = false
      const list = page.list.map((p) => {
        if (p.getId() !== produtoId) return p
        touched = true
        return cloneProdutoComCampoFiscal(p, coluna, valorNormalizado)
      })
      return touched ? { ...page, list } : page
    }),
  }
}
