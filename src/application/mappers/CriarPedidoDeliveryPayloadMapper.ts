import type {
  CriarPedidoDeliveryApiRequest,
  CobrancaPedidoDeliveryApi,
  MomentoCobrancaDeliveryApi,
} from '@/src/application/dto/api/pedidoDeliveryApi'
import type { CriarPedidoDeliveryInputDTO } from '@/src/application/dto/CriarPedidoDeliveryDTO'
import type { ProdutoSelecionado } from '@/src/domain/types/pedido'
import { deveEnviarValorUnitarioAlterado } from '@/src/domain/services/pedido/deveEnviarValorUnitarioAlterado'
import { observacoesArrayFromTexto } from '@/src/shared/helpers/observacaoPedido'
import { valorTaxaEntregaParaCreate } from '@/src/shared/constants/taxaEntregaPedido'

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export function mapProdutosPedidoDeliveryPayload(produtos: ProdutoSelecionado[]) {
  return produtos.map(p => {
    let valorDescontoFinal: number | null = null
    let valorAcrescimoFinal: number | null = null

    if (p.tipoDesconto && p.valorDesconto !== null && p.valorDesconto !== undefined) {
      valorDescontoFinal =
        p.tipoDesconto === 'porcentagem' ? p.valorDesconto / 100 : p.valorDesconto
    }
    if (p.tipoAcrescimo && p.valorAcrescimo !== null && p.valorAcrescimo !== undefined) {
      valorAcrescimoFinal =
        p.tipoAcrescimo === 'porcentagem' ? p.valorAcrescimo / 100 : p.valorAcrescimo
    }

    const observacoes = observacoesArrayFromTexto(p.observacao)

    return {
      produtoId: p.produtoId,
      quantidade: p.quantidade,
      ...(deveEnviarValorUnitarioAlterado(p) ? { valorUnitario: p.valorUnitario } : {}),
      tipoDesconto: p.tipoDesconto || null,
      valorDesconto: valorDescontoFinal,
      tipoAcrescimo: p.tipoAcrescimo || null,
      valorAcrescimo: valorAcrescimoFinal,
      ...(observacoes ? { observacoes } : {}),
      complementos: (p.complementos || []).map(comp => ({
        complementoId: comp.id,
        grupoComplementoId: comp.grupoId,
        quantidade: comp.quantidade,
      })),
    }
  })
}

function buildCobrancasPedidoDeliveryPayload(input: CriarPedidoDeliveryInputDTO) {
  if (input.pagamentos.length === 0) return undefined

  const momentoCobranca: MomentoCobrancaDeliveryApi = input.entregaComCobrancaPeloEntregador
    ? 'na_entrega'
    : 'antecipado'

  return input.pagamentos.map(p => {
    const item: CobrancaPedidoDeliveryApi = {
        meioPagamentoId: p.meioPagamentoId,
        valor: p.valor,
        momentoCobranca,
      }
    if (momentoCobranca === 'antecipado') {
      item.pagamentoEfetivado = { confirmar: true }
    }
    return item
  })
}

function buildClientePedidoDeliveryPayload(input: CriarPedidoDeliveryInputDTO) {
  const telefoneRaw =
    input.telefoneCliente?.trim() ||
    input.moradaEntregaSelecionada?.telefone?.trim() ||
    ''
  const telefone = onlyDigits(telefoneRaw)

  const cliente: CriarPedidoDeliveryApiRequest['cliente'] = { telefone }

  if (input.pedidoComEntrega && input.moradaEntregaSelecionada) {
    const moradaId = input.moradaEntregaSelecionada.id?.trim()
    if (moradaId) {
      cliente.enderecoIdEntrega = moradaId
    }
  }

  return cliente
}

export function buildCriarPedidoDeliveryPayload(
  input: CriarPedidoDeliveryInputDTO
): CriarPedidoDeliveryApiRequest {
  const observacoesPedido = observacoesArrayFromTexto(input.observacaoPedido)
  const cobrancas = buildCobrancasPedidoDeliveryPayload(input)

  // POST Gestor não aceita `taxas`. Automática omite o valor; override manda `valorTaxaEntrega`.
  const payload: CriarPedidoDeliveryApiRequest = {
    origem: 'GESTOR',
    tipoEntrega: input.tipoAtendimentoDelivery,
    cliente: buildClientePedidoDeliveryPayload(input),
    produtos: mapProdutosPedidoDeliveryPayload(input.produtos),
    tempoTotalEstimadoSegundos: Math.max(0, Math.round(input.tempoPrevistoMinutos * 60)),
  }

  const valorTaxa = valorTaxaEntregaParaCreate({
    pedidoComEntrega: input.pedidoComEntrega,
    taxaEntregaId: input.taxaEntregaId,
    valorTaxaEntrega: input.valorTaxaEntrega,
  })
  if (valorTaxa !== undefined) {
    payload.valorTaxaEntrega = valorTaxa
  }

  if (observacoesPedido) {
    payload.observacoes = observacoesPedido
  }

  if (cobrancas && cobrancas.length > 0) {
    payload.cobrancas = cobrancas
  }

  return payload
}
