import { StatusFiscalVenda } from '@/src/domain/value-objects/StatusFiscalVenda'

/** Tempo mínimo após a última atualização fiscal para liberar nova tentativa no Kanban. */
export const COOLDOWN_REEMISSAO_FISCAL_PENDENTE_MS = 10 * 60 * 1000

export function isRetornoSefazLimiteTentativasExcedido(
  retornoSefaz: string | null | undefined
): boolean {
  const texto = String(retornoSefaz ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
  if (!texto) return false
  return (
    texto.includes('maximo de tentativas') ||
    texto.includes('numero maximo de tentativas') ||
    texto.includes('limite de tentativas')
  )
}

/**
 * PENDENTE que não evoluiu para EMITIDA — por retorno explícito ou por nota iniciada sem data de emissão.
 * A listagem unificada nem sempre traz `retornoSefaz`; o fallback cobre documento sem autorização.
 */
export function fiscalPendenteTravadoParaReemissao(input: {
  statusFiscal?: string | null
  retornoSefaz?: string | null
  documentoFiscalId?: string | null
  dataEmissaoFiscal?: string | null
  numeroFiscal?: number | null
}): boolean {
  if (!StatusFiscalVenda.tryParse(input.statusFiscal)?.isPendenteAutorizacao()) return false
  if (isRetornoSefazLimiteTentativasExcedido(input.retornoSefaz)) return true

  const temDocumento =
    Boolean(String(input.documentoFiscalId ?? '').trim()) ||
    (input.numeroFiscal != null && Number.isFinite(Number(input.numeroFiscal)))
  const semDataEmissao = !String(input.dataEmissaoFiscal ?? '').trim()
  return temDocumento && semDataEmissao
}

function obterMsReferenciaCooldownFiscal(input: {
  dataUltimaModificacao?: string | null
  dataEmissaoFiscal?: string | null
  dataFinalizacao?: string | null
  dataCriacao?: string | null
}): number | null {
  for (const raw of [
    input.dataUltimaModificacao,
    input.dataEmissaoFiscal,
    input.dataFinalizacao,
    input.dataCriacao,
  ]) {
    const texto = String(raw ?? '').trim()
    if (!texto) continue
    const ms = new Date(texto).getTime()
    if (Number.isFinite(ms)) return ms
  }
  return null
}

/**
 * PENDENTE com retorno de limite de tentativas da SEFAZ deixa de bloquear reemissão após o cooldown.
 */
export function fiscalPendentePodeReemitirAposCooldown(
  input: {
    statusFiscal?: string | null
    retornoSefaz?: string | null
    documentoFiscalId?: string | null
    dataUltimaModificacao?: string | null
    dataEmissaoFiscal?: string | null
    dataFinalizacao?: string | null
    dataCriacao?: string | null
    numeroFiscal?: number | null
  },
  agoraMs: number = Date.now()
): boolean {
  if (!fiscalPendenteTravadoParaReemissao(input)) return false
  const referenciaMs = obterMsReferenciaCooldownFiscal(input)
  if (referenciaMs === null) return false
  return agoraMs - referenciaMs >= COOLDOWN_REEMISSAO_FISCAL_PENDENTE_MS
}

function primeiroStatusFiscal(
  ...candidatos: Array<string | null | undefined>
): StatusFiscalVenda | null {
  for (const c of candidatos) {
    const parsed = StatusFiscalVenda.tryParse(c)
    if (parsed) return parsed
  }
  return null
}

/**
 * Status em que a aba Nota Fiscal e o resumo fazem sentido (incl. aguardando SEFAZ).
 */
export function statusFiscalPermiteAbaNotaFiscal(s: string | null | undefined): boolean {
  return StatusFiscalVenda.tryParse(s)?.permiteAbaNotaFiscal() ?? false
}

/** PDF DANFE/DANFCE só existe após autorização — mesmo critério do Kanban */
export function statusFiscalEhEmitida(
  resumoStatus: string | null | undefined,
  statusUnificado: string | null | undefined
): boolean {
  return primeiroStatusFiscal(resumoStatus, statusUnificado)?.isEmitida() ?? false
}

export function statusFiscalPermiteCancelarNota(
  resumoStatus: string | null | undefined,
  statusUnificado: string | null | undefined,
  statusDetalhe: string | null | undefined
): boolean {
  return primeiroStatusFiscal(resumoStatus, statusUnificado, statusDetalhe)?.permiteCancelarNota() ?? false
}
