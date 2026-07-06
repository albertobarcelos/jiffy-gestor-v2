import type { Produto } from '@/src/domain/entities/Produto'
import type { ComplementoSelecionado, ProdutoSelecionado } from '@/src/domain/types/pedido'
import {
  normalizarUnidadeMedidaProduto,
  type UnidadeMedidaProduto,
} from '@/src/shared/types/unidadeMedidaProduto'

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
  return obterProdutoDoCatalogo(produtoId, catalogoProdutosPorId, produtosList)?.permiteAlterarPrecoAtivo() ?? false
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
      complementos,
      ...(atualizarValorUnitario ? { valorUnitario: novoValorCatalogo } : {}),
    }
  })
}
