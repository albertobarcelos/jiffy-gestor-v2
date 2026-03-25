import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/** Trecho fiscal alinhado ao detalhe Gestor (`incluirFiscal` / NovoPedidoModal). */
export type ResumoFiscalPublico = {
  status?: string | null
  numero?: number | null
  retornoSefaz?: string | null
  serie?: string | null
  dataEmissao?: string | null
  modelo?: number | null
  chaveFiscal?: string | null
  dataCriacao?: string | null
  dataUltimaModificacao?: string | null
  documentoFiscalId?: string | null
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
    meioPagamentoId?: string
    cancelado?: boolean
  }>
  resumoFiscal?: ResumoFiscalPublico | null
  venda?: VendaContingenciaPublica
}

function unwrapPayload(raw: unknown): VendaContingenciaPublica {
  if (!raw || typeof raw !== 'object') return {}
  const o = raw as Record<string, unknown>
  if (o.venda && typeof o.venda === 'object' && !Array.isArray(o.venda)) {
    const inner = o.venda as VendaContingenciaPublica
    const merged: VendaContingenciaPublica = { ...inner }
    if (
      (merged.resumoFiscal == null || merged.resumoFiscal === undefined) &&
      o.resumoFiscal &&
      typeof o.resumoFiscal === 'object'
    ) {
      merged.resumoFiscal = o.resumoFiscal as ResumoFiscalPublico
    }
    return merged
  }
  return raw as VendaContingenciaPublica
}

/**
 * Exibe rodapé com PNG DANFE/NFC-e 80mm quando a nota está autorizada.
 * Prioriza `resumoFiscal.status`; se ausente, usa `statusFiscal` (fallback).
 */
export function deveExibirRodapeDanfe80mm(data: VendaContingenciaPublica): boolean {
  const r = data.resumoFiscal?.status != null ? String(data.resumoFiscal.status).trim().toUpperCase() : ''
  if (r === 'EMITIDA') return true
  if (r !== '') return false
  const s = data.statusFiscal != null ? String(data.statusFiscal).trim().toUpperCase() : ''
  return s === 'EMITIDA'
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
