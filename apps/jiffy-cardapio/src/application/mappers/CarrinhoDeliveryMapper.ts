import type {
  ItemCarrinhoComplemento,
  ItemCarrinhoDelivery,
} from '@/src/domain/types/carrinho'
import type { ComplementoSelecionado, ProdutoSelecionado } from '@/src/domain/types/pedido'
import { normalizeTipoImpactoPreco } from '@/src/shared/utils/normalizeTipoImpactoPreco'

/** Converte linha do carrinho para o modelo usado pelas calculadoras de pedido. */
export function itemCarrinhoParaProdutoSelecionado(
  item: Pick<
    ItemCarrinhoDelivery,
    'produtoId' | 'produtoNome' | 'quantidade' | 'valorUnitario' | 'complementos' | 'observacoes'
  >,
  opcoes?: { quantidade?: number; valorUnitario?: number }
): ProdutoSelecionado {
  return {
    produtoId: item.produtoId,
    nome: item.produtoNome,
    quantidade: opcoes?.quantidade ?? item.quantidade,
    valorUnitario: opcoes?.valorUnitario ?? item.valorUnitario,
    observacao: item.observacoes.map(o => o.trim()).filter(Boolean).join(' · ') || undefined,
    complementos: item.complementos.map(
      (c): ComplementoSelecionado => ({
        id: c.complementoId,
        grupoId: c.grupoComplementoId,
        nome: c.nome,
        valor: c.valor,
        quantidade: c.quantidade,
        tipoImpactoPreco: normalizeTipoImpactoPreco(c.tipoImpactoPreco),
      })
    ),
  }
}

export function complementosCarrinhoParaSelecionados(
  complementos: ItemCarrinhoComplemento[]
): ComplementoSelecionado[] {
  return complementos.map(c => ({
    id: c.complementoId,
    grupoId: c.grupoComplementoId,
    nome: c.nome,
    valor: c.valor,
    quantidade: c.quantidade,
    tipoImpactoPreco: normalizeTipoImpactoPreco(c.tipoImpactoPreco),
  }))
}
