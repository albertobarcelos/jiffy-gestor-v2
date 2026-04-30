import type { PagamentoSelecionado } from './novoPedidoModal.types'

/**
 * Mesma regra de DetalhesVendas: cancelado pela flag ou por dataCancelamento preenchida.
 */
export function pagamentoEstaCancelado(p: PagamentoSelecionado): boolean {
  return p.cancelado === true || (p.dataCancelamento !== null && p.dataCancelamento !== undefined)
}

/**
 * Pagamentos que entram no total pago e no troco (equivale a `trocoCalculado` / pagamentos válidos em DetalhesVendas).
 * Exclui cancelados; se usa TEF, exige isTefConfirmed === true.
 */
export function pagamentoContaComoEfetivo(p: PagamentoSelecionado): boolean {
  if (pagamentoEstaCancelado(p)) return false

  const usaTef = p.isTefUsed === true
  if (usaTef) {
    const tefConfirmado = p.isTefConfirmed === true
    if (!tefConfirmado) return false
  }
  return true
}

/**
 * Lista exibida no passo 4: oculta TEF não confirmado apenas em pagamento ainda ativo (cancelados seguem visíveis).
 * Igual ao `.filter` de Pagamentos Realizados em DetalhesVendas.
 */
export function pagamentoDeveAparecerNosDetalhesPedido(p: PagamentoSelecionado): boolean {
  const isCancelado = pagamentoEstaCancelado(p)
  const usaTef = p.isTefUsed === true
  if (usaTef && !isCancelado) {
    if (p.isTefConfirmed !== true) return false
  }
  return true
}

/** Destaque vermelho: somente pagamentos cancelados (TEF pendente ativo não é renderizado na lista). */
export function pagamentoComDestaqueCanceladoDetalhes(p: PagamentoSelecionado): boolean {
  return pagamentoEstaCancelado(p)
}

/**
 * Mapeia item de pagamento do GET venda (PDV ou Gestor) para o estado do modal.
 * Garante as mesmas regras de DetalhesVendas: cancelado explícito ou com dataCancelamento; TEF só quando isTefUsed.
 */
export function mapearPagamentoDetalheVenda(pag: Record<string, unknown>): PagamentoSelecionado {
  const p = pag as Record<string, unknown>
  const dataCancelamentoRaw = p.dataCancelamento ?? p.data_cancelamento
  const temDataCancelamento =
    dataCancelamentoRaw != null &&
    dataCancelamentoRaw !== undefined &&
    String(dataCancelamentoRaw).trim() !== ''
  const canceladoExplicito =
    p.cancelado === true || p.cancelado === 'true' || p.cancelado === 1 || p.cancelado === '1'
  const cancelado = canceladoExplicito || temDataCancelamento

  const isTefUsed = p.isTefUsed === true || p.is_tef_used === true
  let isTefConfirmed: boolean | undefined
  if (isTefUsed) {
    if (p.isTefConfirmed === true || p.is_tef_confirmed === true) isTefConfirmed = true
    else if (p.isTefConfirmed === false || p.is_tef_confirmed === false) isTefConfirmed = false
  }

  return {
    meioPagamentoId: String(p.meioPagamentoId ?? p.id ?? ''),
    valor: typeof p.valor === 'number' ? p.valor : Number(p.valor) || 0,
    realizadoPorId: (p.realizadoPorId ?? p.realizado_por_id) as string | undefined,
    cancelado,
    canceladoPorId: (p.canceladoPorId ?? p.cancelado_por_id) as string | undefined,
    dataCriacao: (p.dataCriacao ?? p.data_criacao) as string | undefined,
    dataCancelamento: temDataCancelamento ? String(dataCancelamentoRaw) : undefined,
    isTefUsed,
    isTefConfirmed,
    tefIdentifier: (p.tefIdentifier ?? p.tef_identifier) as string | undefined,
    tefAdquirente: (p.tefAdquirente ?? p.tef_adquirente) as string | undefined,
    cnpjAdquirente: (p.cnpjAdquirente ?? p.cnpj_adquirente) as string | undefined,
    codigoAutorizacao: (p.codigoAutorizacao ?? p.codigo_autorizacao) as string | undefined,
    tipoIntegracao: (p.tipoIntegracao ?? p.tipo_integracao) as string | undefined,
    bandeiraCartao: (p.bandeiraCartao ?? p.bandeira_cartao) as string | undefined,
  }
}

/**
 * Texto do campo Origem no painel de detalhes (abas Dados / contexto visualização).
 * O GET de detalhe do PDV não retorna `origem`; nesse caso a venda é tratada como PDV.
 */
export function rotuloOrigemParaExibicao(origemBrutaApi: string | null): string {
  if (origemBrutaApi == null || String(origemBrutaApi).trim() === '') {
    return 'PDV'
  }
  const o = String(origemBrutaApi).trim().toUpperCase()
  if (o === 'GESTOR') return 'Gestor'
  if (o === 'PDV') return 'PDV'
  if (o === 'IFOOD' || o === 'DELIVERY_IFOOD') return 'iFood'
  if (o === 'RAPPI' || o === 'DELIVERY_UBER') return 'Rappi'
  if (o === 'OUTROS') return 'Outros'
  return String(origemBrutaApi).trim()
}

/**
 * Status em que a aba Nota Fiscal e o resumo fazem sentido (incl. aguardando SEFAZ).
 * Alinhado ao Kanban e ao `StatusFiscalBadge` ("Aguardando SEFAZ..." para PENDENTE / PENDENTE_AUTORIZACAO).
 */
const STATUS_FISCAL_ABA_NOTA_FISCAL = new Set([
  'EMITIDA',
  'REJEITADA',
  'PENDENTE',
  'PENDENTE_AUTORIZACAO',
])

export function statusFiscalPermiteAbaNotaFiscal(s: string | null | undefined): boolean {
  if (s == null || String(s).trim() === '') return false
  return STATUS_FISCAL_ABA_NOTA_FISCAL.has(String(s).trim().toUpperCase())
}

/** PDF DANFE/DANFCE só existe após autorização — mesmo critério do Kanban */
export function statusFiscalEhEmitida(
  resumoStatus: string | null | undefined,
  statusUnificado: string | null | undefined
): boolean {
  const r = resumoStatus != null ? String(resumoStatus).trim() : ''
  const u = statusUnificado != null ? String(statusUnificado).trim() : ''
  const s = (r !== '' ? r : u).toUpperCase()
  return s === 'EMITIDA'
}

export function statusFiscalPermiteCancelarNota(
  resumoStatus: string | null | undefined,
  statusUnificado: string | null | undefined,
  statusDetalhe: string | null | undefined
): boolean {
  const r = resumoStatus != null ? String(resumoStatus).trim() : ''
  const u = statusUnificado != null ? String(statusUnificado).trim() : ''
  const d = statusDetalhe != null ? String(statusDetalhe).trim() : ''
  const s = (r !== '' ? r : u !== '' ? u : d).toUpperCase()
  // Só é possível cancelar nota já emitida
  return s === 'EMITIDA'
}
