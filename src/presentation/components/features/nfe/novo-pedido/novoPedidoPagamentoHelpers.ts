import type { PagamentoSelecionado } from './types'

/**
 * Mesma regra de DetalhesVendas: cancelado pela flag ou por dataCancelamento preenchida.
 */
export function pagamentoEstaCancelado(p: PagamentoSelecionado): boolean {
  return (
    p.cancelado === true ||
    (p.dataCancelamento !== null && p.dataCancelamento !== undefined)
  )
}

/**
 * Pagamentos que entram no total pago e no troco (equivale a `trocoCalculado` / pagamentos válidos em DetalhesVendas).
 * Exclui cancelados; se usa TEF, exige isTefConfirmed === true.
 */
export function pagamentoContaComoEfetivo(p: PagamentoSelecionado): boolean {
  if (pagamentoEstaCancelado(p)) return false
  if (p.cobrarNaEntrega === true || p.naoEfetivo === true) return false

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
  const p = pag as Record<string, any>
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
    id: p.id != null ? String(p.id) : p.pagamentoId != null ? String(p.pagamentoId) : undefined,
    meioPagamentoId: String(
      p.meioPagamentoId ?? p.meio_pagamento_id ?? p.meioPagamento?.id ?? ''
    ),
    valor: typeof p.valor === 'number' ? p.valor : Number(p.valor) || 0,
    cobrarNaEntrega:
      p.cobrarNaEntrega === true ||
      p.cobrar_na_entrega === true ||
      p.cobrarNaEntrega === 'true' ||
      p.cobrar_na_entrega === 'true',
    naoEfetivo:
      p.efetivado === false ||
      p.efetivado === 'false' ||
      p.cobrarNaEntrega === true ||
      p.cobrar_na_entrega === true ||
      p.cobrarNaEntrega === 'true' ||
      p.cobrar_na_entrega === 'true',
    realizadoPorId: p.realizadoPorId ?? p.realizado_por_id ?? undefined,
    cancelado,
    canceladoPorId: p.canceladoPorId ?? p.cancelado_por_id ?? undefined,
    dataCriacao: p.dataCriacao ?? p.data_criacao ?? undefined,
    dataCancelamento: temDataCancelamento ? String(dataCancelamentoRaw) : undefined,
    isTefUsed,
    isTefConfirmed,
    tefIdentifier: p.tefIdentifier ?? p.tef_identifier ?? undefined,
    tefAdquirente: p.tefAdquirente ?? p.tef_adquirente ?? undefined,
    cnpjAdquirente: p.cnpjAdquirente ?? p.cnpj_adquirente ?? undefined,
    codigoAutorizacao: p.codigoAutorizacao ?? p.codigo_autorizacao ?? undefined,
    tipoIntegracao: p.tipoIntegracao ?? p.tipo_integracao ?? undefined,
    bandeiraCartao: p.bandeiraCartao ?? p.bandeira_cartao ?? undefined,
  }
}
