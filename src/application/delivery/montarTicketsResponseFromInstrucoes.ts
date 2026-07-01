import {
  extrairContextoEntregaDeVendaData,
  extrairEnderecoEntregaSnapshotDeVendaData,
} from '@/src/application/mappers/ContextoEntregaDeliveryMapper'
import type { EnderecoEntregaDetalhe } from '@/src/domain/types/vendaDetalhe'
import type { PreferenciasImpressaoDelivery } from '@/src/shared/types/deliveryImpressao'
import type { EstacaoImpressaoMapeamento } from '@/src/infrastructure/api/estacoesImpressaoApi'
import { isTcpPrinterRef } from '@/src/infrastructure/printing/qzTrayClient'
import type { InstrucoesImpressaoResponse } from '@/src/shared/types/instrucoesImpressao'
import type {
  VendaGestorTicket,
  VendaGestorTicketItem,
  VendaGestorTicketItemComplemento,
  VendaGestorTicketWarning,
  VendaGestorTicketsEndereco,
  VendaGestorTicketsPagamento,
  VendaGestorTicketsPagamentoMeio,
  VendaGestorTicketsResponse,
} from '@/src/shared/types/vendaGestorTickets'
import type { EmpresaMeResumo } from '@/src/presentation/hooks/useEmpresaMe'

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  return v as Record<string, unknown>
}

function asStr(v: unknown): string {
  if (v == null) return ''
  return String(v).trim()
}

function isoOrEmpty(v: unknown): string {
  if (v == null) return ''
  if (v instanceof Date) return v.toISOString()
  const s = String(v).trim()
  return s
}

function numeroFinito(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function enderecoDetalheParaTicketsEndereco(
  endereco: EnderecoEntregaDetalhe | null | undefined
): VendaGestorTicketsEndereco | null {
  if (!endereco) return null
  return {
    rua: endereco.rua ?? undefined,
    numero: endereco.numero ?? undefined,
    bairro: endereco.bairro ?? undefined,
    cidade: endereco.cidade ?? undefined,
    estado: endereco.estado ?? undefined,
    cep: endereco.cep ?? undefined,
    complemento: endereco.complemento ?? undefined,
    referencia: endereco.referencia ?? undefined,
  }
}

function produtoLancadoAtivo(pl: Record<string, unknown>): boolean {
  if (pl.removido === true) return false
  if (pl.dataRemocao != null && asStr(pl.dataRemocao)) return false
  return true
}

function mapComplemento(c: Record<string, unknown>): VendaGestorTicketItemComplemento {
  const quantidade = numeroFinito(c.quantidade) || 1
  const valorUnitario = numeroFinito(c.valorUnitario)
  return {
    nome: asStr(c.nomeComplemento) || asStr(c.nome),
    quantidade,
    impressao: {
      quantidade,
      valorUnitario,
      valorFinal: quantidade * valorUnitario,
      valorTotal: quantidade * valorUnitario,
    },
  }
}

function mapItemProdutoLancado(pl: Record<string, unknown>): VendaGestorTicketItem {
  const observacoes = Array.isArray(pl.observacoes) ? pl.observacoes : []
  const obsTexto = observacoes
    .map(o => {
      const r = asRecord(o)
      return r ? asStr(r.observacao) : ''
    })
    .filter(Boolean)
    .join('\n')

  const complementos = Array.isArray(pl.complementos)
    ? pl.complementos
        .map(c => asRecord(c))
        .filter((c): c is Record<string, unknown> => c != null)
        .map(mapComplemento)
    : []

  return {
    produtoLancadoId: asStr(pl.id),
    produtoId: asStr(pl.produtoId),
    nomeProduto: asStr(pl.nomeProduto) || 'Item',
    quantidade: numeroFinito(pl.quantidade) || 1,
    valorUnitario: numeroFinito(pl.valorUnitario),
    valorFinal: numeroFinito(pl.valorFinal),
    valorTotal: numeroFinito(pl.valorFinal),
    observacao: obsTexto || undefined,
    complementos,
  }
}

function buildResumoPedido(
  pedido: Record<string, unknown>,
  produtosAtivos: Record<string, unknown>[]
): VendaGestorTicketsResponse['resumoPedido'] {
  const valorItens = produtosAtivos.reduce((s, p) => s + numeroFinito(p.valorFinal), 0)
  const valorAdicionais = produtosAtivos.reduce((s, p) => {
    const comps = Array.isArray(p.complementos) ? p.complementos : []
    return (
      s +
      comps.reduce((ss, c) => {
        const r = asRecord(c)
        if (!r) return ss
        const q = numeroFinito(r.quantidade) || 1
        return ss + q * numeroFinito(r.valorUnitario)
      }, 0)
    )
  }, 0)
  const taxas = Array.isArray(pedido.taxasLancadas) ? pedido.taxasLancadas : []
  const taxaEntrega = taxas.reduce((s, t) => {
    const r = asRecord(t)
    if (!r) return s
    return s + numeroFinito(r.valorCalculado ?? r.valor)
  }, 0)
  const valorTotal = numeroFinito(pedido.valorFinal)
  return { valorItens, valorAdicionais, taxaEntrega, valorTotal }
}

function extrairNomeMeioPagamentoDeRegistro(
  registro: Record<string, unknown> | null,
  meioPagamentoId?: string,
  nomesMeiosPagamentoPorId?: Record<string, string>
): string | null {
  if (!registro) return null
  const nested = asRecord(registro.meioPagamento)
  const nomeNested = asStr(nested?.nome)
  if (nomeNested) return nomeNested

  const id =
    asStr(registro.meioPagamentoId) ||
    asStr(nested?.id) ||
    meioPagamentoId ||
  ''
  if (id && nomesMeiosPagamentoPorId?.[id]?.trim()) {
    return nomesMeiosPagamentoPorId[id].trim()
  }

  const nomeDireto = asStr(registro.nomeMeioPagamento) || asStr(registro.nome)
  return nomeDireto || null
}

function buildPagamento(
  pedido: Record<string, unknown>,
  nomesMeiosPagamentoPorId?: Record<string, string>
): VendaGestorTicketsPagamento | null {
  const totalFaltaPagar = numeroFinito(pedido.totalFaltaPagar)
  const valorFinal = numeroFinito(pedido.valorFinal)
  const totalPago = numeroFinito(pedido.totalPago)
  const troco = numeroFinito(pedido.troco)

  const cobrancas = Array.isArray(pedido.cobrancas) ? pedido.cobrancas : []
  let cobrancaNaEntrega: Record<string, unknown> | null = null
  for (const c of cobrancas) {
    const r = asRecord(c)
    if (!r) continue
    const momento = asStr(r.momentoCobranca).toLowerCase()
    const status = asStr(r.status).toLowerCase()
    if (momento === 'na_entrega' && status !== 'paga' && status !== 'cancelada') {
      cobrancaNaEntrega = r
      break
    }
  }

  const valorCobrarNaEntrega = cobrancaNaEntrega
    ? numeroFinito(cobrancaNaEntrega.valor)
    : totalFaltaPagar
  const cobrarCliente = valorCobrarNaEntrega > 0

  const meioIdCobranca = cobrancaNaEntrega ? asStr(cobrancaNaEntrega.meioPagamentoId) : ''
  let meioPagamentoNome = extrairNomeMeioPagamentoDeRegistro(
    cobrancaNaEntrega,
    meioIdCobranca,
    nomesMeiosPagamentoPorId
  )
  if (!meioPagamentoNome && cobrancaNaEntrega) {
    const pagamentoEfetivado = asRecord(cobrancaNaEntrega.pagamentoEfetivado)
    meioPagamentoNome = extrairNomeMeioPagamentoDeRegistro(
      pagamentoEfetivado,
      asStr(pagamentoEfetivado?.meioPagamentoId) || meioIdCobranca,
      nomesMeiosPagamentoPorId
    )
  }

  const meios: VendaGestorTicketsPagamentoMeio[] = []
  for (const c of cobrancas) {
    const r = asRecord(c)
    if (!r) continue
    const status = asStr(r.status).toLowerCase()
    if (status === 'cancelada') continue
    const meioId = asStr(r.meioPagamentoId)
    const nome = extrairNomeMeioPagamentoDeRegistro(r, meioId, nomesMeiosPagamentoPorId)
    if (!nome) continue
    meios.push({
      nome,
      valor: numeroFinito(r.valor),
    })
  }

  return {
    status: totalFaltaPagar > 0 ? 'pendente' : 'pago',
    cobrarCliente,
    meioPagamento: meioPagamentoNome ?? undefined,
    formaPagamento: meioPagamentoNome ?? undefined,
    valorCobrarNaEntrega,
    trocoParaLevar: troco > 0 ? troco : undefined,
    valorReceber: valorFinal,
    valorRecebido: totalPago,
    valorFaltante: totalFaltaPagar,
    meios: meios.length > 0 ? meios : undefined,
  }
}

function buildObservacaoPedido(pedido: Record<string, unknown>): string | undefined {
  const obs = Array.isArray(pedido.observacoes) ? pedido.observacoes : []
  const texto = obs
    .map(o => {
      const r = asRecord(o)
      return r ? asStr(r.observacao) : ''
    })
    .filter(Boolean)
    .join('\n')
  return texto || undefined
}

function coletarFallbackProdutoLancadoIds(
  warnings: InstrucoesImpressaoResponse['warnings']
): Set<string> {
  const ids = new Set<string>()
  for (const w of warnings) {
    if (w.code !== 'PRODUTO_SEM_IMPRESSORA_FALLBACK_EXPEDICAO') continue
    const id = w.contexto?.produtoLancadoId
    if (id != null && String(id).trim()) ids.add(String(id).trim())
  }
  return ids
}

function resolverMapeamentoWindowsParaImpressora(
  impressoraId: string | null | undefined,
  instrucoesMapeamentos: InstrucoesImpressaoResponse['mapeamentos'],
  mapeamentosEstacao?: EstacaoImpressaoMapeamento[]
): { nomeImpressoraWindows: string | null; impressoraNome: string | null } {
  if (!impressoraId?.trim()) {
    return { nomeImpressoraWindows: null, impressoraNome: null }
  }
  const id = impressoraId.trim()

  const fromInstrucoes = instrucoesMapeamentos.find(m => m.impressoraId === id)
  const windowsInstrucoes = fromInstrucoes?.nomeImpressoraWindows?.trim() || null

  const fromEstacao = mapeamentosEstacao?.find(m => m.impressoraId === id)
  const windowsEstacao = fromEstacao?.nomeImpressoraWindows?.trim() || null

  // IP/tcp configurado neste terminal tem prioridade sobre nome Windows da API.
  if (windowsEstacao && isTcpPrinterRef(windowsEstacao)) {
    return {
      nomeImpressoraWindows: windowsEstacao,
      impressoraNome: fromEstacao?.nomeImpressora ?? fromInstrucoes?.impressoraNome ?? null,
    }
  }
  if (windowsInstrucoes && isTcpPrinterRef(windowsInstrucoes)) {
    return {
      nomeImpressoraWindows: windowsInstrucoes,
      impressoraNome: fromInstrucoes?.impressoraNome ?? null,
    }
  }

  if (windowsInstrucoes) {
    return {
      nomeImpressoraWindows: windowsInstrucoes,
      impressoraNome: fromInstrucoes?.impressoraNome ?? null,
    }
  }

  if (windowsEstacao) {
    return {
      nomeImpressoraWindows: windowsEstacao,
      impressoraNome: fromEstacao?.nomeImpressora ?? null,
    }
  }

  return {
    nomeImpressoraWindows: null,
    impressoraNome: fromInstrucoes?.impressoraNome ?? fromEstacao?.nomeImpressora ?? null,
  }
}

function ticketTemOrigemFallback(
  produtosLancadosIds: string[],
  fallbackIds: Set<string>,
  impressoraExpedicaoId: string | null,
  impressoraId: string | null
): boolean {
  if (!impressoraExpedicaoId || impressoraId !== impressoraExpedicaoId) return false
  if (produtosLancadosIds.length === 0) return false
  return produtosLancadosIds.every(id => fallbackIds.has(id))
}

function montarTicket(params: {
  tipoCupom: VendaGestorTicket['tipoCupom']
  impressoraId: string | null
  impressoraNome: string | null
  nomeImpressoraWindows: string | null
  copias: number
  produtosLancadosIds: string[]
  produtoPorId: Map<string, Record<string, unknown>>
  origemImpressora?: string | null
}): VendaGestorTicket | null {
  const itens = params.produtosLancadosIds
    .map(id => params.produtoPorId.get(id))
    .filter((p): p is Record<string, unknown> => p != null)
    .map(mapItemProdutoLancado)

  if (itens.length === 0) return null

  const nomeWindows = params.nomeImpressoraWindows?.trim() || null

  return {
    tipoCupom: params.tipoCupom,
    impressoraId: params.impressoraId,
    impressoraNome: params.impressoraNome,
    nomeImpressoraWindows: nomeWindows,
    impressora: {
      id: params.impressoraId,
      nome: params.impressoraNome,
      nomeImpressoraWindows: nomeWindows,
      mapeamentoEncontrado: Boolean(nomeWindows),
      origem: params.origemImpressora ?? null,
    },
    copias: params.copias,
    itens,
  }
}

/**
 * Monta `VendaGestorTicketsResponse` compatível com o fluxo legado de tickets,
 * combinando instruções de roteamento + detalhe do pedido + prefs da empresa.
 */
export function montarTicketsResponseFromInstrucoes(params: {
  instrucoes: InstrucoesImpressaoResponse
  pedido: Record<string, unknown>
  prefs: PreferenciasImpressaoDelivery
  empresa?: EmpresaMeResumo | null
  estacaoImpressaoId?: string | null
  /** Mapeamentos salvos na estação local — usados quando a impressora de expedição não aparece nas instruções do pedido. */
  mapeamentosEstacao?: EstacaoImpressaoMapeamento[]
  /** Nomes dos meios de pagamento (id → nome) para o rodapé do cupom. */
  nomesMeiosPagamentoPorId?: Record<string, string>
}): VendaGestorTicketsResponse {
  const {
    instrucoes,
    pedido,
    prefs,
    empresa,
    estacaoImpressaoId,
    mapeamentosEstacao,
    nomesMeiosPagamentoPorId,
  } = params
  const modo = prefs.modo
  const impressoraExpedicaoId = prefs.impressoraExpedicaoId

  const produtosRaw = Array.isArray(pedido.produtosLancados) ? pedido.produtosLancados : []
  const produtosAtivos = produtosRaw
    .map(p => asRecord(p))
    .filter((p): p is Record<string, unknown> => p != null && produtoLancadoAtivo(p))

  const produtoPorId = new Map<string, Record<string, unknown>>()
  for (const p of produtosAtivos) {
    const id = asStr(p.id)
    if (id) produtoPorId.set(id, p)
  }

  const todosIdsAtivos = [...produtoPorId.keys()]
  const fallbackIds = coletarFallbackProdutoLancadoIds(instrucoes.warnings)

  const contexto = extrairContextoEntregaDeVendaData(pedido)
  const clienteRaw = asRecord(pedido.cliente)
  const entregadorRaw = asRecord(pedido.entregador)
  const enderecoSnapshot = extrairEnderecoEntregaSnapshotDeVendaData(pedido)

  const clienteNome =
    asStr(clienteRaw?.nome) || asStr(contexto?.destinatarioNome) || undefined
  const clienteTelefone =
    asStr(contexto?.destinatarioTelefone) ||
    asStr(clienteRaw?.telefone) ||
    asStr(clienteRaw?.celular) ||
    undefined

  const tickets: VendaGestorTicket[] = []

  if (modo === 'unificado') {
    const mapping = instrucoes.mapeamentos[0]
    const impressoraIdUnificado = mapping?.impressoraId ?? impressoraExpedicaoId
    const mapeamentoUnificado = resolverMapeamentoWindowsParaImpressora(
      impressoraIdUnificado,
      instrucoes.mapeamentos,
      mapeamentosEstacao
    )
    const ids =
      mapping?.produtosLancadosIds?.length
        ? mapping.produtosLancadosIds
        : todosIdsAtivos
    const ticket = montarTicket({
      tipoCupom: 'unificado',
      impressoraId: impressoraIdUnificado,
      impressoraNome: mapping?.impressoraNome ?? mapeamentoUnificado.impressoraNome,
      nomeImpressoraWindows:
        mapeamentoUnificado.nomeImpressoraWindows ?? mapping?.nomeImpressoraWindows,
      copias: Math.max(1, prefs.copiasCupomUnificado),
      produtosLancadosIds: ids,
      produtoPorId,
      origemImpressora: 'expedicao_unificado',
    })
    if (ticket) tickets.push(ticket)
  } else {
    for (const mapping of instrucoes.mapeamentos) {
      const ids = mapping.produtosLancadosIds ?? []
      const origemFallback = ticketTemOrigemFallback(
        ids,
        fallbackIds,
        impressoraExpedicaoId,
        mapping.impressoraId
      )
      const ticket = montarTicket({
        tipoCupom: 'producao',
        impressoraId: mapping.impressoraId,
        impressoraNome: mapping.impressoraNome,
        nomeImpressoraWindows: mapping.nomeImpressoraWindows,
        copias: 1,
        produtosLancadosIds: ids,
        produtoPorId,
        origemImpressora: origemFallback ? 'fallback_expedicao' : 'produto',
      })
      if (ticket) tickets.push(ticket)
    }

    const expedicaoMapping = instrucoes.mapeamentos.find(
      m => m.impressoraId != null && m.impressoraId === impressoraExpedicaoId
    )
    const mapeamentoExpedicao = resolverMapeamentoWindowsParaImpressora(
      impressoraExpedicaoId,
      instrucoes.mapeamentos,
      mapeamentosEstacao
    )
    const ticketExpedicao = montarTicket({
      tipoCupom: 'expedicao',
      impressoraId: impressoraExpedicaoId,
      impressoraNome: expedicaoMapping?.impressoraNome ?? mapeamentoExpedicao.impressoraNome,
      nomeImpressoraWindows:
        expedicaoMapping?.nomeImpressoraWindows ?? mapeamentoExpedicao.nomeImpressoraWindows,
      copias: 1,
      produtosLancadosIds: todosIdsAtivos,
      produtoPorId,
      origemImpressora: 'expedicao',
    })
    if (ticketExpedicao) tickets.push(ticketExpedicao)
  }

  const warnings: VendaGestorTicketWarning[] = instrucoes.warnings.map(w => ({
    code: w.code,
    message: w.message,
    detalhe: w.detalhe,
    contexto: w.contexto,
  }))

  const vendaId = asStr(pedido.id)
  const tipoEntrega = asStr(pedido.tipoEntrega ?? pedido.tipoVenda)

  return {
    rastreamento: {
      geradoEm: new Date().toISOString(),
      empresaId: empresa?.id,
      vendaId,
      codigoVenda: asStr(pedido.codigoVenda),
      numeroVenda: numeroFinito(pedido.numeroVenda),
      modoImpressaoDelivery: modo,
      estacaoImpressaoId: estacaoImpressaoId ?? undefined,
    },
    vendaId,
    estacaoImpressaoId: estacaoImpressaoId ?? undefined,
    codigoVenda: asStr(pedido.codigoVenda) || undefined,
    numeroVenda: numeroFinito(pedido.numeroVenda),
    tipoVenda: tipoEntrega || null,
    dataPedido: isoOrEmpty(pedido.dataCriacao),
    dataPrevista: isoOrEmpty(pedido.previsaoEntregaEm ?? pedido.previsaoEntrega),
    entregador: entregadorRaw
      ? {
          id: asStr(entregadorRaw.id) || undefined,
          nome: asStr(entregadorRaw.nome) || undefined,
          telefone: asStr(entregadorRaw.telefone) || undefined,
        }
      : null,
    cliente: clienteNome || clienteTelefone ? { nome: clienteNome, telefone: clienteTelefone } : null,
    observacaoPedido: buildObservacaoPedido(pedido),
    enderecoEntrega: enderecoDetalheParaTicketsEndereco(enderecoSnapshot),
    valorFinal: numeroFinito(pedido.valorFinal),
    resumoPedido: buildResumoPedido(pedido, produtosAtivos),
    pagamento: buildPagamento(pedido, nomesMeiosPagamentoPorId),
    empresa: empresa
      ? {
          nomeExibicao: empresa.nomeExibicao,
          nome: empresa.nomeExibicao,
        }
      : null,
    modoImpressaoDelivery: modo,
    copiasCupomUnificado: prefs.copiasCupomUnificado,
    imprimirAoReceber: prefs.imprimirAoReceber,
    imprimirAoFicarPronto: prefs.imprimirAoFicarPronto,
    tickets,
    warnings,
  }
}
