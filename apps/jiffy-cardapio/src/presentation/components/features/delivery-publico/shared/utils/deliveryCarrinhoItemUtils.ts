import {
  calcularTotalComplementos,
  calcularTotalProduto,
} from '@/src/domain/services/pedido/CalculadoraPedido'
import { sincronizarComplementosCarrinho } from '@/src/domain/policies/pedido/SincronizarComplementosQuantidadeProduto'
import { itemCarrinhoParaProdutoSelecionado } from '@/src/application/mappers/CarrinhoDeliveryMapper'
import { normalizeTipoImpactoPreco } from '@/src/shared/utils/normalizeTipoImpactoPreco'
import type {
  DeliveryCarrinhoComplemento,
  DeliveryCarrinhoItem,
} from '../stores/deliveryCarrinhoStore'

const TOLERANCIA_TOTAL_BRL = 0.015

function impactoComplementosAbsoluto(complementos: DeliveryCarrinhoComplemento[]): number {
  if (complementos.length === 0) return 0
  return calcularTotalComplementos(
    itemCarrinhoParaProdutoSelecionado(
      {
        produtoId: '_',
        produtoNome: '_',
        quantidade: 1,
        valorUnitario: 0,
        observacoes: [],
        complementos,
      },
      { quantidade: 1, valorUnitario: 0 }
    )
  )
}

/**
 * Detecta carrinho legado: `valorUnitario` já incluía impacto por unidade e
 * `valorTotal === valorUnitario * quantidade`.
 */
function itemUsaValorUnitarioComComplementos(
  item: Pick<DeliveryCarrinhoItem, 'quantidade' | 'valorUnitario' | 'valorTotal' | 'complementos'>
): boolean {
  if (item.complementos.length === 0) return false
  const qtd = Math.max(1, Math.floor(item.quantidade))
  return Math.abs(item.valorTotal - item.valorUnitario * qtd) < TOLERANCIA_TOTAL_BRL
}

/** Preço base do produto (sem complementos), compatível com carrinho legado. */
export function valorUnitarioBaseProduto(item: DeliveryCarrinhoItem): number {
  if (item.complementos.length === 0) return item.valorUnitario
  if (itemUsaValorUnitarioComComplementos(item)) {
    return item.valorUnitario - impactoComplementosAbsoluto(item.complementos)
  }
  return item.valorUnitario
}

/**
 * Modelo canônico da linha: `valorUnitario` = base do produto;
 * quantidades de complemento absolutas na linha (sincronizadas com qtd do produto);
 * `valorTotal` = base×qtd + impacto dos complementos.
 */
export function recalcularLinhaCarrinho(
  item: Omit<DeliveryCarrinhoItem, 'id' | 'adicionadoEm' | 'valorUnitario' | 'valorTotal'> & {
    valorUnitarioBase: number
  }
): Omit<DeliveryCarrinhoItem, 'id' | 'adicionadoEm'> {
  const quantidade = Math.max(1, Math.floor(item.quantidade))
  const complementos = sincronizarComplementosCarrinho(item.complementos, quantidade).map(c => ({
    ...c,
    valor: Math.abs(Number(c.valor) || 0),
    tipoImpactoPreco: normalizeTipoImpactoPreco(c.tipoImpactoPreco),
  }))
  const valorUnitario = item.valorUnitarioBase
  const valorTotal = calcularTotalProduto(
    itemCarrinhoParaProdutoSelecionado(
      {
        produtoId: item.produtoId,
        produtoNome: item.produtoNome,
        quantidade,
        valorUnitario,
        observacoes: item.observacoes,
        complementos,
      },
      { quantidade, valorUnitario }
    )
  )

  return {
    produtoId: item.produtoId,
    produtoNome: item.produtoNome,
    produtoImagemUrl: item.produtoImagemUrl,
    quantidade,
    valorUnitario,
    valorTotal,
    observacoes: item.observacoes,
    complementos,
  }
}

/** Migra/recalcula item persistido (legado per-unit → absoluto na linha). */
export function normalizarItemCarrinho(item: DeliveryCarrinhoItem): DeliveryCarrinhoItem {
  const base = valorUnitarioBaseProduto(item)
  const recalculado = recalcularLinhaCarrinho({
    produtoId: item.produtoId,
    produtoNome: item.produtoNome,
    produtoImagemUrl: item.produtoImagemUrl,
    quantidade: item.quantidade,
    observacoes: item.observacoes,
    complementos: item.complementos,
    valorUnitarioBase: base,
  })
  return {
    ...recalculado,
    id: item.id,
    adicionadoEm: item.adicionadoEm,
  }
}

export function observacaoItemCarrinho(item: DeliveryCarrinhoItem): string {
  return item.observacoes.map(o => o.trim()).filter(Boolean).join(' · ')
}

type LinhaCarrinhoComparable = Pick<
  DeliveryCarrinhoItem,
  'produtoId' | 'complementos' | 'observacoes'
> & {
  quantidade?: number
}

function normalizarObservacaoLinha(observacoes: string[]): string {
  return observacoes
    .map(o => o.trim())
    .filter(Boolean)
    .join(' · ')
}

/** Quantidade “por unidade” para comparar linhas (ignora sync 1:1 com o produto). */
function quantidadeComplementoPorUnidade(
  quantidadeComplemento: number,
  quantidadeProduto: number
): number {
  const qtdComp = Math.max(1, Math.floor(quantidadeComplemento))
  const qtdProd = Math.max(1, Math.floor(quantidadeProduto))
  if (qtdProd > 1 && qtdComp === qtdProd) return 1
  return qtdComp
}

function assinaturaComplementos(
  complementos: DeliveryCarrinhoComplemento[],
  quantidadeProduto: number
): string {
  return [...complementos]
    .map(c => {
      const qtd = quantidadeComplementoPorUnidade(c.quantidade, quantidadeProduto)
      return `${c.grupoComplementoId}:${c.complementoId}:${qtd}`
    })
    .sort()
    .join('|')
}

/** Chave estável: mesmo produto + mesmos complementos (por unidade) + mesma observação. */
export function chaveLinhaCarrinho(item: LinhaCarrinhoComparable): string {
  const quantidadeProduto = Math.max(1, Math.floor(item.quantidade ?? 1))
  return [
    item.produtoId,
    assinaturaComplementos(item.complementos, quantidadeProduto),
    normalizarObservacaoLinha(item.observacoes),
  ].join('::')
}

/** Retorna o item existente com a mesma chave, opcionalmente ignorando um id (ex.: linha em edição). */
export function encontrarItemIgual(
  itens: DeliveryCarrinhoItem[],
  candidato: LinhaCarrinhoComparable,
  ignoreItemId?: string
): DeliveryCarrinhoItem | null {
  const chave = chaveLinhaCarrinho(candidato)
  for (const item of itens) {
    if (ignoreItemId && item.id === ignoreItemId) continue
    if (chaveLinhaCarrinho(item) === chave) return item
  }
  return null
}

/** Remove um complemento do item e recalcula valor unitário/total. */
export function itemSemComplemento(
  item: DeliveryCarrinhoItem,
  complementoId: string,
  grupoComplementoId: string
): Omit<DeliveryCarrinhoItem, 'id' | 'adicionadoEm'> {
  const normalizado = normalizarItemCarrinho(item)
  const complementos = normalizado.complementos.filter(
    c => !(c.complementoId === complementoId && c.grupoComplementoId === grupoComplementoId)
  )
  return recalcularLinhaCarrinho({
    produtoId: normalizado.produtoId,
    produtoNome: normalizado.produtoNome,
    produtoImagemUrl: normalizado.produtoImagemUrl,
    quantidade: normalizado.quantidade,
    observacoes: normalizado.observacoes,
    complementos,
    valorUnitarioBase: normalizado.valorUnitario,
  })
}
