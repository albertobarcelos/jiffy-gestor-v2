import { Produto } from '@/src/domain/entities/Produto'
import type { ProdutoPatch } from '@/src/shared/types/produto'

const collator = new Intl.Collator('pt-BR', { sensitivity: 'accent', numeric: false })

function ordemNumerica(valor: number | undefined): number {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : Number.MAX_SAFE_INTEGER
}

/**
 * Ordem do cardápio: categoria (`GrupoProduto.ordem`) e depois o produto no grupo.
 * Nome só desempatar quando a ordem for igual ou ausente.
 */
export function sortProdutosPorOrdemMenu(
  lista: Produto[],
  ordemGrupoPorId: ReadonlyMap<string, number>
): Produto[] {
  return [...lista].sort((a, b) => {
    const ordemGrupoA = ordemGrupoPorId.get(a.getGrupoId() ?? '') ?? Number.MAX_SAFE_INTEGER
    const ordemGrupoB = ordemGrupoPorId.get(b.getGrupoId() ?? '') ?? Number.MAX_SAFE_INTEGER
    if (ordemGrupoA !== ordemGrupoB) return ordemGrupoA - ordemGrupoB

    const ordemA = ordemNumerica(a.getOrdem())
    const ordemB = ordemNumerica(b.getOrdem())
    if (ordemA !== ordemB) return ordemA - ordemB

    return collator.compare(a.getNome(), b.getNome())
  })
}

export function mapaOrdemGrupoProduto(
  grupos: Array<{ getId: () => string; getOrdem: () => number | undefined }>
): Map<string, number> {
  const map = new Map<string, number>()
  for (const grupo of grupos) {
    map.set(grupo.getId(), ordemNumerica(grupo.getOrdem()))
  }
  return map
}

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
    parsed.getDescricao(),
    parsed.getNomeGrupo(),
    parsed.getGrupoId(),
    parsed.getEstoque(),
    parsed.isFavorito(),
    parsed.abreComplementosAtivo(),
    parsed.permiteAcrescimoAtivo(),
    parsed.permiteDescontoAtivo(),
    parsed.permiteAlterarPrecoAtivo(),
    parsed.incideTaxaAtivo(),
    parsed.isAtivoDelivery(),
    parsed.isAtivoLocal(),
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
    patch.nome ?? produto.getNome(),
    patch.valor ?? produto.getValor(),
    patch.ativo ?? produto.isAtivo(),
    produto.getDescricao(),
    patch.nomeGrupo ?? produto.getNomeGrupo(),
    patch.grupoId ?? produto.getGrupoId(),
    produto.getEstoque(),
    patch.favorito ?? produto.isFavorito(),
    patch.abreComplementos ?? produto.abreComplementosAtivo(),
    patch.permiteAcrescimo ?? produto.permiteAcrescimoAtivo(),
    patch.permiteDesconto ?? produto.permiteDescontoAtivo(),
    patch.permiteAlterarPreco ?? produto.permiteAlterarPrecoAtivo(),
    patch.incideTaxa ?? produto.incideTaxaAtivo(),
    patch.ativoDelivery ?? produto.isAtivoDelivery(),
    produto.isAtivoLocal(),
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
