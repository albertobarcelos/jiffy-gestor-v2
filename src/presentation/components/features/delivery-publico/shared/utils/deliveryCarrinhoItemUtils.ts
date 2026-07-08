import { normalizeTipoImpactoPreco } from '@/src/application/mappers/VendaApiNormalizer'
import { calcularTotalComplementos } from '@/src/domain/services/pedido/CalculadoraPedido'
import type { DeliveryCarrinhoItem } from '../stores/deliveryCarrinhoStore'

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
