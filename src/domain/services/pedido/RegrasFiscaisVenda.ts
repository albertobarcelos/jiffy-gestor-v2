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
  return s === 'EMITIDA'
}
