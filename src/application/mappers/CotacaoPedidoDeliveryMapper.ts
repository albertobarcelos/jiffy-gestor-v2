import type { ProdutoSelecionado } from '@/src/domain/types/pedido'
import { observacoesArrayFromTexto } from '@/src/shared/helpers/observacaoPedido'
import type {
  CotacaoPedidoDeliveryBackendRequest,
  CotacaoPedidoDeliveryBffRequest,
  CotacaoPedidoDeliveryProdutoItem,
  ResultadoCotacaoTaxaMorada,
} from '@/src/application/dto/api/cotacaoPedidoDeliveryApi'
import { mensagemIndicaForaDaCobertura } from '@/src/domain/policies/pedido/cotacaoEntregaPolicy'

export function mapProdutosParaCotacaoDelivery(
  produtos: ProdutoSelecionado[]
): CotacaoPedidoDeliveryProdutoItem[] {
  return produtos
    .filter(p => !p.removido && p.quantidade > 0 && p.produtoId.trim())
    .map(p => {
      const observacoes = observacoesArrayFromTexto(p.observacao)
      const complementos = (p.complementos || [])
        .filter(c => c.quantidade > 0 && c.id.trim() && c.grupoId.trim())
        .map(c => ({
          complementoId: c.id,
          grupoComplementoId: c.grupoId,
          quantidade: c.quantidade,
        }))
      const item: CotacaoPedidoDeliveryProdutoItem = {
        produtoId: p.produtoId,
        quantidade: p.quantidade,
      }
      if (observacoes) item.observacoes = observacoes
      if (complementos.length > 0) item.complementos = complementos
      return item
    })
}

export function chaveItensCotacaoDelivery(produtos: CotacaoPedidoDeliveryProdutoItem[]): string {
  return JSON.stringify(
    produtos.map(p => ({
      produtoId: p.produtoId,
      quantidade: p.quantidade,
      observacoes: p.observacoes ?? [],
      complementos: p.complementos ?? [],
    }))
  )
}

export function montarCotacaoPedidoDeliveryBackend(args: {
  slug: string
  body: CotacaoPedidoDeliveryBffRequest
}): CotacaoPedidoDeliveryBackendRequest {
  return {
    slug: args.slug.trim(),
    tipoEntrega: args.body.tipoEntrega,
    cliente: args.body.cliente,
    produtos: args.body.produtos,
  }
}

function numeroTaxa(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : null
}

export function parseResultadoCotacaoTaxaMorada(
  raw: unknown,
  erroHttp?: { status: number; message: string }
): ResultadoCotacaoTaxaMorada {
  if (erroHttp) {
    if (mensagemIndicaForaDaCobertura(erroHttp.message)) {
      return { status: 'fora' }
    }
    return { status: 'erro', message: erroHttp.message }
  }

  if (!raw || typeof raw !== 'object') {
    return { status: 'erro', message: 'Resposta de cotação inválida.' }
  }

  const entrega = (raw as { entrega?: { taxaEntrega?: unknown } | null }).entrega
  const valorTaxa = numeroTaxa(entrega?.taxaEntrega)
  if (valorTaxa == null) {
    return { status: 'erro', message: 'Cotação sem taxa de entrega.' }
  }
  return { status: 'ok', valorTaxa }
}
