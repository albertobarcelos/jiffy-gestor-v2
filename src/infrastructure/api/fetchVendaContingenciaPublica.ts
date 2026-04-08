import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/** Trecho fiscal alinhado ao detalhe Gestor (`incluirFiscal` / NovoPedidoModal). */
export type ResumoFiscalPublico = {
  /** Id do registro fiscal na API (às vezes igual ao usado no microserviço quando `documentoFiscalId` vem vazio). */
  id?: string | null
  status?: string | null
  numero?: number | null
  retornoSefaz?: string | null
  codigoRetorno?: string | null
  serie?: string | null
  dataEmissao?: string | null
  modelo?: number | null
  chaveFiscal?: string | null
  dataCriacao?: string | null
  dataUltimaModificacao?: string | null
  documentoFiscalId?: string | null
  empresaId?: string | null
  vendaId?: string | null
  terminalId?: string | null
}

/** Resposta flexível do GET público de venda em contingência (contrato pode evoluir no backend). */
export type VendaContingenciaPublica = {
  cupomFiscal?: string
  textoCupom?: string
  cupomContingencia?: string
  id?: string
  idPublico?: string
  codigoVenda?: string
  numeroVenda?: number
  valorFinal?: number
  totalDesconto?: number
  totalAcrescimo?: number
  dataCriacao?: string
  dataFinalizacao?: string
  codigoTerminal?: string
  identificacao?: string
  troco?: number
  statusFiscal?: string | null
  retornoSefaz?: string | null
  numeroFiscal?: number | null
  serieFiscal?: string | null
  tipoDocFiscal?: string | null
  dataEmissaoFiscal?: string | null
  documentoFiscalId?: string | null
  nomeEmpresa?: string
  clienteNome?: string
  terminalNome?: string
  empresa?: { nome?: string; cnpj?: string }
  produtosLancados?: Array<{
    nomeProduto?: string
    quantidade?: number
    valorUnitario?: number
    desconto?: string | number
    acrescimo?: string | number
    complementos?: Array<{
      nomeComplemento?: string
      quantidade?: number
      valorUnitario?: number
    }>
    removido?: boolean
  }>
  pagamentos?: Array<{
    valor?: number
    nomeMeioPagamento?: string
    /** Contrato GET vendas-contingencia (PDV). */
    meioPagamentoNome?: string
    meioPagamentoId?: string
    cancelado?: boolean
  }>
  resumoFiscal?: ResumoFiscalPublico | null
  venda?: VendaContingenciaPublica
}

function isPlainRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v)
}

/** Une campos de string priorizando o primeiro não vazio (evita `undefined` do spread sobrescrever). */
function pickStr(a: unknown, b: unknown): string | undefined {
  const sa = typeof a === 'string' ? a.trim() : ''
  const sb = typeof b === 'string' ? b.trim() : ''
  return sa || sb || undefined
}

function mergeResumoFiscal(
  inner: ResumoFiscalPublico | null | undefined,
  outer: ResumoFiscalPublico | null | undefined
): ResumoFiscalPublico | undefined {
  if (!inner && !outer) return undefined
  const i = inner || {}
  const u = outer || {}
  return {
    ...u,
    ...i,
    id: pickStr(i.id, u.id),
    documentoFiscalId: pickStr(i.documentoFiscalId, u.documentoFiscalId),
    status: pickStr(i.status, u.status),
    chaveFiscal: pickStr(i.chaveFiscal, u.chaveFiscal),
    numero: i.numero ?? u.numero,
    serie: pickStr(i.serie, u.serie),
    retornoSefaz: pickStr(i.retornoSefaz, u.retornoSefaz),
    dataEmissao: pickStr(i.dataEmissao, u.dataEmissao),
    modelo: i.modelo ?? u.modelo,
    dataCriacao: pickStr(i.dataCriacao, u.dataCriacao),
    dataUltimaModificacao: pickStr(i.dataUltimaModificacao, u.dataUltimaModificacao),
  }
}

function unwrapPayload(raw: unknown): VendaContingenciaPublica {
  if (!raw || typeof raw !== 'object') return {}
  let o = raw as Record<string, unknown>

  // BFF: `{ "data": { "venda": ... } }` sem `venda` na raiz
  if (
    isPlainRecord(o.data) &&
    !isPlainRecord(o.venda) &&
    (isPlainRecord((o.data as Record<string, unknown>).venda) ||
      typeof (o.data as Record<string, unknown>).cupomFiscal === 'string')
  ) {
    o = o.data as Record<string, unknown>
  }

  if (isPlainRecord(o.venda)) {
    const inner = o.venda as VendaContingenciaPublica
    const merged: VendaContingenciaPublica = { ...inner }

    merged.resumoFiscal = mergeResumoFiscal(
      inner.resumoFiscal,
      isPlainRecord(o.resumoFiscal) ? (o.resumoFiscal as ResumoFiscalPublico) : undefined
    )

    merged.documentoFiscalId = pickStr(merged.documentoFiscalId, o.documentoFiscalId)
    merged.statusFiscal = pickStr(merged.statusFiscal, o.statusFiscal) ?? merged.statusFiscal

    return merged
  }
  return raw as VendaContingenciaPublica
}

const STATUS_RODAPE_OK = new Set(['EMITIDA', 'AUTORIZADA'])

/**
 * Exibe rodapé com PNG DANFE/NFC-e 80mm quando a nota está autorizada.
 * Chave fiscal preenchida implica documento válido para consulta/QR.
 * Prioriza `resumoFiscal.status`; se ausente, usa `statusFiscal` (fallback).
 */
export function deveExibirRodapeDanfe80mm(data: VendaContingenciaPublica): boolean {
  const chave = data.resumoFiscal?.chaveFiscal?.trim()
  if (chave) return true
  const r = data.resumoFiscal?.status != null ? String(data.resumoFiscal.status).trim().toUpperCase() : ''
  if (STATUS_RODAPE_OK.has(r)) return true
  if (r !== '') return false
  const s = data.statusFiscal != null ? String(data.statusFiscal).trim().toUpperCase() : ''
  return STATUS_RODAPE_OK.has(s)
}

/** ID do documento fiscal para o PNG público 80mm no microserviço (`/v1/public/documentos/{id}/...`). */
export function resolveDocumentoFiscalIdPublico(data: VendaContingenciaPublica): string | null {
  const root = data as Record<string, unknown>
  const resumo = isPlainRecord(root.resumoFiscal) ? root.resumoFiscal : null

  const candidates: unknown[] = [
    data.resumoFiscal?.documentoFiscalId,
    data.documentoFiscalId,
    resumo?.documento_fiscal_id,
    resumo?.documentoFiscalId,
    /** Alguns ambientes expõem só `resumoFiscal.id` como UUID do documento. */
    data.resumoFiscal?.id,
    resumo?.id,
    root.documento_fiscal_id,
    root.documentoFiscalId,
  ]

  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim()
  }
  return null
}

/**
 * Busca venda por identificador público (rota do Gestor: `/notas-fiscais/{vendaId}`).
 * Opcional: EXTERNAL_API_PUBLIC_KEY — se o backend exigir chave de serviço, envia em X-Api-Key.
 */
export async function fetchVendaContingenciaPublica(vendaId: string): Promise<VendaContingenciaPublica> {
  const trimmed = vendaId?.trim()
  if (!trimmed) {
    throw new ApiError('Identificador inválido', 400)
  }

  const apiClient = new ApiClient()
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  const serviceKey = process.env.EXTERNAL_API_PUBLIC_KEY?.trim()
  if (serviceKey) {
    headers['X-Api-Key'] = serviceKey
  }

  const { data } = await apiClient.request<unknown>(
    `/api/v1/operacao-pdv/vendas-contingencia/${encodeURIComponent(trimmed)}`,
    {
      method: 'GET',
      headers,
    }
  )

  return unwrapPayload(data)
}
