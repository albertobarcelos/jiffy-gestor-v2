import type { PagamentoSelecionado } from '@/src/domain/types/pedido'

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

  const meioPagamentoNested =
    p.meioPagamento && typeof p.meioPagamento === 'object'
      ? (p.meioPagamento as Record<string, unknown>)
      : null

  return {
    id:
      p.id != null
        ? String(p.id)
        : p.pagamentoId != null
          ? String(p.pagamentoId)
          : undefined,
    meioPagamentoId: String(
      p.meioPagamentoId ?? p.meio_pagamento_id ?? meioPagamentoNested?.id ?? ''
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
    realizadoPorId:
      p.realizadoPorId != null
        ? String(p.realizadoPorId)
        : p.realizado_por_id != null
          ? String(p.realizado_por_id)
          : undefined,
    cancelado,
    canceladoPorId:
      p.canceladoPorId != null
        ? String(p.canceladoPorId)
        : p.cancelado_por_id != null
          ? String(p.cancelado_por_id)
          : undefined,
    dataCriacao:
      p.dataCriacao != null
        ? String(p.dataCriacao)
        : p.data_criacao != null
          ? String(p.data_criacao)
          : undefined,
    dataCancelamento: temDataCancelamento ? String(dataCancelamentoRaw) : undefined,
    isTefUsed,
    isTefConfirmed,
    tefIdentifier:
      p.tefIdentifier != null
        ? String(p.tefIdentifier)
        : p.tef_identifier != null
          ? String(p.tef_identifier)
          : undefined,
    tefAdquirente:
      p.tefAdquirente != null
        ? String(p.tefAdquirente)
        : p.tef_adquirente != null
          ? String(p.tef_adquirente)
          : undefined,
    cnpjAdquirente:
      p.cnpjAdquirente != null
        ? String(p.cnpjAdquirente)
        : p.cnpj_adquirente != null
          ? String(p.cnpj_adquirente)
          : undefined,
    codigoAutorizacao:
      p.codigoAutorizacao != null
        ? String(p.codigoAutorizacao)
        : p.codigo_autorizacao != null
          ? String(p.codigo_autorizacao)
          : undefined,
    tipoIntegracao:
      p.tipoIntegracao != null
        ? String(p.tipoIntegracao)
        : p.tipo_integracao != null
          ? String(p.tipo_integracao)
          : undefined,
    bandeiraCartao:
      p.bandeiraCartao != null
        ? String(p.bandeiraCartao)
        : p.bandeira_cartao != null
          ? String(p.bandeira_cartao)
          : undefined,
  }
}
