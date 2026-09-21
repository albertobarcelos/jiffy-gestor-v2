import { Produto } from '@/src/domain/entities/Produto'
import type { ComplementoSelecionado, ProdutoSelecionado } from '@/src/domain/types/pedido'
import {
  normalizarUnidadeMedidaProduto,
  type UnidadeMedidaProduto,
} from '@/src/shared/types/unidadeMedidaProduto'
import type { MenuProdutoPermissoes } from '@/src/shared/utils/menuProdutoPermissoes'

export type CarregarProdutoCatalogoOptions = {
  forceRefresh?: boolean
  /** Não reutilizar snapshot slim da grade — precisa dos itens dos grupos do produto do menu. */
  requireComplementos?: boolean
}

export function produtoTemComplementosCarregados(
  produto: Pick<Produto, 'getGruposComplementos'>
): boolean {
  const grupos = produto.getGruposComplementos()
  if (grupos.length === 0) return false
  return grupos.every(
    grupo => (grupo.complementos?.length ?? 0) > 0 && grupo.limitesDoCadastro === true
  )
}

/** Grade slim já trouxe os ids dos grupos do menu — dá para hidratar só eles. */
export function produtoTemIdsGruposComplementoParaHidratacao(
  produto: Pick<Produto, 'getGruposComplementos'>
): boolean {
  return produto.getGruposComplementos().some(grupo => grupo.id.trim() !== '')
}

/**
 * Snapshot da grade do menu traz só o resumo dos grupos (id/nome).
 * Só reutiliza cache quando os itens já foram hidratados a partir do produto do menu.
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

/**
 * Lançar com `requireComplementos`: o slim da grade basta para completar grupos
 * (cache de sessão ou GET por id). Evita GET cadastro + GET snapshot.
 */
export function catalogoPermiteHidratacaoSomenteGrupos(
  produto: Produto | undefined,
  options?: CarregarProdutoCatalogoOptions
): produto is Produto {
  if (options?.forceRefresh) return false
  if (!options?.requireComplementos) return false
  if (!produto) return false
  if (produtoTemComplementosCarregados(produto)) return false
  return produtoTemIdsGruposComplementoParaHidratacao(produto)
}

/**
 * Aplica flags do cadastro (índice slim) no snapshot da grade.
 * `abreComplementos` fica com o produto do menu — o vínculo de grupos no cadastro base vai deixar de existir.
 */
export function aplicarPermissoesCadastroNoProdutoCatalogo(
  produto: Produto,
  permissoes: MenuProdutoPermissoes | undefined
): Produto {
  if (!permissoes) return produto
  if (produtoTemComplementosCarregados(produto)) return produto
  if (
    produto.permiteAcrescimoAtivo() === permissoes.permiteAcrescimo &&
    produto.permiteDescontoAtivo() === permissoes.permiteDesconto &&
    produto.permiteAlterarPrecoAtivo() === permissoes.permiteAlterarPreco &&
    produto.incideTaxaAtivo() === permissoes.incideTaxa
  ) {
    return produto
  }
  return Produto.fromJSON({
    ...produto.toJSON(),
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
