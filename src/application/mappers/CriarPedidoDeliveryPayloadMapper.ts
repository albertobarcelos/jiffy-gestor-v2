import type {
  CriarPedidoDeliveryApiRequest,
  CobrancaPedidoDeliveryApi,
  MomentoCobrancaDeliveryApi,
} from '@/src/application/dto/api/pedidoDeliveryApi'
import type { CriarPedidoDeliveryInputDTO } from '@/src/application/dto/CriarPedidoDeliveryDTO'
import type { ProdutoSelecionado } from '@/src/domain/types/pedido'
import { observacoesArrayFromTexto } from '@/src/shared/helpers/observacaoPedido'

function mapEtiquetaDelivery(raw?: string): 'casa' | 'trabalho' | 'outro' {
  const t = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (t === 'casa' || t === 'trabalho') return t
  return 'outro'
}

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

  const nome = input.clienteEntregaVinculado?.nome?.trim()
  if (nome) cliente.nome = nome

  if (input.pedidoComEntrega && input.moradaEntregaSelecionada?.endereco) {
    const e = input.moradaEntregaSelecionada.endereco
    cliente.enderecos = [
      {
        etiqueta: mapEtiquetaDelivery(input.moradaEntregaSelecionada.tipoEtiqueta),
        rua: String(e.rua ?? '').trim(),
        numero: String(e.numero ?? '').trim(),
        bairro: String(e.bairro ?? '').trim(),
        cidade: e.cidade?.trim() || undefined,
        estado: e.estado?.trim().slice(0, 2).toUpperCase() || undefined,
        cep: onlyDigits(String(e.cep ?? '')).slice(0, 8) || undefined,
        complemento: e.complemento?.trim() || undefined,
      },
    ]
  }

  return cliente
}

function buildTaxasPedidoDeliveryPayload(input: CriarPedidoDeliveryInputDTO) {
  if (!input.pedidoComEntrega) return undefined
  const taxaId = input.taxaEntregaSelecionada?.getId()?.trim()
  if (!taxaId) return undefined
  return [{ taxaId, quantidade: 1 }]
}

export function buildCriarPedidoDeliveryPayload(
  input: CriarPedidoDeliveryInputDTO
): CriarPedidoDeliveryApiRequest {
  const observacoesPedido = observacoesArrayFromTexto(input.observacaoPedido)
  const cobrancas = buildCobrancasPedidoDeliveryPayload(input)
  const taxas = buildTaxasPedidoDeliveryPayload(input)

  const payload: CriarPedidoDeliveryApiRequest = {
    origem: 'GESTOR',
    tipoEntrega: input.tipoAtendimentoDelivery,
    cliente: buildClientePedidoDeliveryPayload(input),
    produtos: mapProdutosPedidoDeliveryPayload(input.produtos),
    tempoTotalEstimadoSegundos: Math.max(0, Math.round(input.tempoPrevistoMinutos * 60)),
  }

  if (observacoesPedido) {
    payload.observacoes = observacoesPedido
  }

  if (cobrancas && cobrancas.length > 0) {
    payload.cobrancas = cobrancas
  }

  if (taxas && taxas.length > 0) {
    payload.taxas = taxas
  }

  return payload
}
