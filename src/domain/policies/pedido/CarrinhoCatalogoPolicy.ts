import { Produto } from '@/src/domain/entities/Produto'
import type { ComplementoSelecionado, ProdutoSelecionado } from '@/src/domain/types/pedido'
import {
  normalizarUnidadeMedidaProduto,
  type UnidadeMedidaProduto,
} from '@/src/shared/types/unidadeMedidaProduto'
import type { MenuProdutoPermissoes } from '@/src/shared/utils/menuProdutoPermissoes'

export type CarregarProdutoCatalogoOptions = {
  forceRefresh?: boolean
  /** Não reutilizar snapshot slim da grade — precisa dos grupos/itens do cadastro. */
  requireComplementos?: boolean
}

export function produtoTemComplementosCarregados(
  produto: Pick<Produto, 'getGruposComplementos'>
): boolean {
  return produto
    .getGruposComplementos()
    .some(grupo => (grupo.complementos?.length ?? 0) > 0)
}

/**
 * Snapshot da grade do menu não traz os itens de complemento.
 * Só reutiliza cache quando ele já tem os grupos carregados (GET do cadastro).
 */
export function cacheProdutoCatalogoAtendePedido(
  produto: Produto | undefined,
  options?: CarregarProdutoCatalogoOptions
): produto is Produto {
  if (options?.forceRefresh) return false
  if (!produto) return false
  if (options?.requireComplementos && !produtoTemComplementosCarregados(produto)) {
    return false
  }
  return true
}

/** Aplica flags do cadastro (índice slim) no snapshot da grade, sem apagar complementos já hidratados. */
export function aplicarPermissoesCadastroNoProdutoCatalogo(
  produto: Produto,
  permissoes: MenuProdutoPermissoes | undefined
): Produto {
  if (!permissoes) return produto
  if (produtoTemComplementosCarregados(produto)) return produto
  if (
    produto.abreComplementosAtivo() === permissoes.abreComplementos &&
    produto.permiteAcrescimoAtivo() === permissoes.permiteAcrescimo &&
    produto.permiteDescontoAtivo() === permissoes.permiteDesconto &&
    produto.permiteAlterarPrecoAtivo() === permissoes.permiteAlterarPreco &&
    produto.incideTaxaAtivo() === permissoes.incideTaxa
  ) {
    return produto
  }
  return Produto.fromJSON({
    ...produto.toJSON(),
    abreComplementos: permissoes.abreComplementos,
    permiteAcrescimo: permissoes.permiteAcrescimo,
    permiteDesconto: permissoes.permiteDesconto,
    permiteAlterarPreco: permissoes.permiteAlterarPreco,
    incideTaxa: permissoes.incideTaxa,
  })
}

export function obterProdutoDoCatalogo(
  produtoId: string,
  catalogoProdutosPorId: Record<string, Produto>,
  produtosList: Produto[]
): Produto | undefined {
  return catalogoProdutosPorId[produtoId] ?? produtosList.find(p => p.getId() === produtoId)
}

export function produtoPermiteAlterarPreco(
  produtoId: string,
  catalogoProdutosPorId: Record<string, Produto>,
  produtosList: Produto[]
): boolean {
  return (
    obterProdutoDoCatalogo(produtoId, catalogoProdutosPorId, produtosList)?.permiteAlterarPrecoAtivo() ??
    false
  )
}

export function obterUnidadeMedidaProdutoLinha(
  linha: Pick<ProdutoSelecionado, 'produtoId' | 'unidadeMedida'>,
  catalogoProdutosPorId: Record<string, Produto>,
  produtosList: Produto[]
): UnidadeMedidaProduto {
  if (linha.unidadeMedida) {
    return normalizarUnidadeMedidaProduto(linha.unidadeMedida)
  }
  const catalogo = obterProdutoDoCatalogo(linha.produtoId, catalogoProdutosPorId, produtosList)
  return catalogo?.getUnidadeMedida() ?? 'UN'
}

function mapComplementosCatalogoPorId(produto: Produto): Map<string, ComplementoSelecionado> {
  const map = new Map<string, ComplementoSelecionado>()
  for (const grupo of produto.getGruposComplementos()) {
    for (const complemento of grupo.complementos) {
      map.set(complemento.id, {
        id: complemento.id,
        grupoId: grupo.id,
        nome: complemento.nome,
        valor: complemento.valor ?? 0,
        quantidade: 0,
        tipoImpactoPreco: complemento.tipoImpactoPreco,
      })
    }
  }
  return map
}

/**
 * Reaplica dados cadastrais do produto nas linhas do carrinho (nome, unidade, preço base e complementos).
 * Mantém `valorUnitario` customizado quando o produto permite alterar preço e o valor da linha difere do catálogo anterior.
 */
export function aplicarProdutoAtualizadoNasLinhasCarrinho(
  produtos: ProdutoSelecionado[],
  produtoAtualizado: Produto,
  produtoAnterior?: Produto | null
): ProdutoSelecionado[] {
  const produtoId = produtoAtualizado.getId()
  const permiteAlterarPreco = produtoAtualizado.permiteAlterarPrecoAtivo()
  const novoValorCatalogo = produtoAtualizado.getValor()
  const valorAnteriorCatalogo = produtoAnterior?.getValor()
  const complementosCatalogo = mapComplementosCatalogoPorId(produtoAtualizado)

  return produtos.map(linha => {
    if (linha.produtoId !== produtoId) return linha

    const atualizarValorUnitario =
      !permiteAlterarPreco ||
      (valorAnteriorCatalogo != null && linha.valorUnitario === valorAnteriorCatalogo)

    const complementos = linha.complementos.map(complementoLinha => {
      const complementoCatalogo = complementosCatalogo.get(complementoLinha.id)
      if (!complementoCatalogo) return complementoLinha
      return {
        ...complementoLinha,
        grupoId: complementoCatalogo.grupoId,
        nome: complementoCatalogo.nome,
        valor: complementoCatalogo.valor,
        tipoImpactoPreco: complementoCatalogo.tipoImpactoPreco,
      }
    })

    const ncmAtualizado = produtoAtualizado.getNcm()

    return {
      ...linha,
      nome: produtoAtualizado.getNome(),
      unidadeMedida: produtoAtualizado.getUnidadeMedida(),
      ncm: ncmAtualizado || linha.ncm,
      valorCatalogo: novoValorCatalogo,
      permiteAlterarPreco,
      complementos,
      ...(atualizarValorUnitario ? { valorUnitario: novoValorCatalogo } : {}),
    }
  })
}
