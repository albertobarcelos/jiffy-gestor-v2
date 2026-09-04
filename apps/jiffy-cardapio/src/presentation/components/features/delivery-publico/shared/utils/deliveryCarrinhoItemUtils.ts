import { normalizeTipoImpactoPreco } from '@/src/shared/utils/normalizeTipoImpactoPreco'
import { calcularTotalComplementos } from '@/src/domain/services/pedido/CalculadoraPedido'
import type {
  DeliveryCarrinhoComplemento,
  DeliveryCarrinhoItem,
} from '../stores/deliveryCarrinhoStore'

export function valorUnitarioBaseProduto(item: DeliveryCarrinhoItem): number {
  if (item.complementos.length === 0) return item.valorUnitario
  const impactoComplementos = calcularTotalComplementos({
    produtoId: item.produtoId,
    nome: item.produtoNome,
    quantidade: 1,
    valorUnitario: 0,
    complementos: item.complementos.map(c => ({
      id: c.complementoId,
      grupoId: c.grupoComplementoId,
      nome: c.nome,
      valor: c.valor,
      quantidade: c.quantidade,
      tipoImpactoPreco: normalizeTipoImpactoPreco(c.tipoImpactoPreco),
    })),
  })
  return item.valorUnitario - impactoComplementos
}

export function observacaoItemCarrinho(item: DeliveryCarrinhoItem): string {
  return item.observacoes.map(o => o.trim()).filter(Boolean).join(' · ')
}

type LinhaCarrinhoComparable = Pick<
  DeliveryCarrinhoItem,
  'produtoId' | 'complementos' | 'observacoes'
>

function normalizarObservacaoLinha(observacoes: string[]): string {
  return observacoes
    .map(o => o.trim())
    .filter(Boolean)
    .join(' · ')
}

function assinaturaComplementos(complementos: DeliveryCarrinhoComplemento[]): string {
  return [...complementos]
    .map(c => `${c.grupoComplementoId}:${c.complementoId}:${c.quantidade}`)
    .sort()
    .join('|')
}

/** Chave estável: mesmo produto + mesmos complementos (qtd) + mesma observação. */
export function chaveLinhaCarrinho(item: LinhaCarrinhoComparable): string {
  return [
    item.produtoId,
    assinaturaComplementos(item.complementos),
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

function impactoComplementos(
  item: Pick<DeliveryCarrinhoItem, 'produtoId' | 'produtoNome'>,
  complementos: DeliveryCarrinhoComplemento[]
): number {
  if (complementos.length === 0) return 0
  return calcularTotalComplementos({
    produtoId: item.produtoId,
    nome: item.produtoNome,
    quantidade: 1,
    valorUnitario: 0,
    complementos: complementos.map(c => ({
      id: c.complementoId,
      grupoId: c.grupoComplementoId,
      nome: c.nome,
      valor: c.valor,
      quantidade: c.quantidade,
      tipoImpactoPreco: normalizeTipoImpactoPreco(c.tipoImpactoPreco),
    })),
  })
}

/** Remove um complemento do item e recalcula valor unitário/total. */
export function itemSemComplemento(
  item: DeliveryCarrinhoItem,
  complementoId: string,
  grupoComplementoId: string
): Omit<DeliveryCarrinhoItem, 'id' | 'adicionadoEm'> {
  const complementos = item.complementos.filter(
    c => !(c.complementoId === complementoId && c.grupoComplementoId === grupoComplementoId)
  )
  const base = valorUnitarioBaseProduto(item)
  const valorUnitario = base + impactoComplementos(item, complementos)

  return {
    produtoId: item.produtoId,
    produtoNome: item.produtoNome,
    produtoImagemUrl: item.produtoImagemUrl,
    quantidade: item.quantidade,
    valorUnitario,
    valorTotal: valorUnitario * item.quantidade,
    observacoes: item.observacoes,
    complementos,
  }
}
