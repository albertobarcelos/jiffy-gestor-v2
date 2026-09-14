import type { SnapshotCoberturaPedido } from '@/src/domain/relatorio-entregadores/tipos'

function numeroOpcional(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function textoOpcional(raw: unknown): string | null {
  const s = raw == null ? '' : String(raw).trim()
  return s || null
}

function taxaEntregaAtiva(raw: Record<string, unknown>): boolean {
  if (raw.ativa === false) return false
  const status = String(raw.status ?? '').trim().toLowerCase()
  if (status === 'removida' || status === 'cancelada') return false
  const dataRemocao = raw.dataRemocao
  if (dataRemocao != null && String(dataRemocao).trim() !== '') return false
  return true
}

function ehTipoEntrega(tipo: string): boolean {
  return tipo === 'entrega' || tipo === 'entrega_sistema'
}

function entregadorIdDoDetalhe(detalhe: Record<string, unknown>): string | null {
  const direto = textoOpcional(detalhe.entregadorId)
  if (direto) return direto
  const nested = detalhe.entregador
  if (nested && typeof nested === 'object') {
    return textoOpcional((nested as Record<string, unknown>).id)
  }
  return null
}

export function mapearEntregadorIdPedidoDelivery(detalhe: Record<string, unknown>): string | null {
  return entregadorIdDoDetalhe(detalhe)
}

/** Lê área/raio e o valor da taxa já lançada no pedido (snapshot ou valor da venda). */
export function mapearSnapshotCoberturaPedidoDelivery(
  detalhe: Record<string, unknown>
): SnapshotCoberturaPedido | null {
  const taxas = Array.isArray(detalhe.taxasLancadas) ? detalhe.taxasLancadas : []
  let areaId: string | null = null
  let raioId: string | null = null
  let valor: number | null = null

  for (const item of taxas) {
    if (!item || typeof item !== 'object') continue
    const taxa = item as Record<string, unknown>
    if (!taxaEntregaAtiva(taxa)) continue

    const tipo = String(taxa.tipo ?? taxa.tipoTaxa ?? '')
      .trim()
      .toLowerCase()
    const snapRaw = taxa.taxaLancadaEntrega
    const snap = snapRaw && typeof snapRaw === 'object' ? (snapRaw as Record<string, unknown>) : null

    if (!ehTipoEntrega(tipo) && !snap) continue

    if (snap) {
      areaId = textoOpcional(snap.deliveryAreaEntregaId) ?? areaId
      raioId = textoOpcional(snap.deliveryRaioEntregaId) ?? raioId
      valor = numeroOpcional(snap.valorCalculadoSistema) ?? valor
    }

    valor =
      valor ??
      numeroOpcional(taxa.valorCalculado) ??
      numeroOpcional(taxa.valorAplicado) ??
      numeroOpcional(taxa.valor)
  }

  const valorRaiz =
    numeroOpcional(detalhe.taxaEntrega) ??
    numeroOpcional(detalhe.taxaEntregaValor) ??
    (detalhe.resumoPedido && typeof detalhe.resumoPedido === 'object'
      ? numeroOpcional((detalhe.resumoPedido as Record<string, unknown>).taxaEntrega)
      : null)

  valor = valor ?? valorRaiz

  if (!areaId && !raioId && valor == null) return null

  return {
    areaId,
    raioId,
    valorCalculadoSistema: valor,
  }
}
