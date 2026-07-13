import { normalizeTipoImpactoPreco } from '@/src/application/mappers/VendaApiNormalizer'
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
