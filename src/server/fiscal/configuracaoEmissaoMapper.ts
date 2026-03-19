export type AmbienteFiscal = 'HOMOLOGACAO' | 'PRODUCAO'

export type EmissaoResponse = {
  modelo: number
  ambiente?: AmbienteFiscal | string
  serie?: number
  proximoNumero?: number
  numeroInicial?: number
  ativo?: boolean
  nfceCscId?: string
  nfceCscCodigo?: string
}

export type NumeracaoView = {
  id: string
  modelo: number
  serie: number
  proximoNumero: number
  numeroInicial: number
  ativo: boolean
  terminalId: null
  nfeAtivo?: boolean
  nfceAtivo?: boolean
  nfceCscId?: string
  nfceCscCodigo?: string
  ambiente?: AmbienteFiscal
}

export function parseModelo(value: unknown): number {
  return Number(value)
}

export function normalizeAmbiente(value: unknown): AmbienteFiscal {
  const raw = String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()

  if (raw === 'PRODUCAO') {
    return 'PRODUCAO'
  }

  if (raw === 'HOMOLOGACAO') {
    return 'HOMOLOGACAO'
  }

  throw new Error(
    `Ambiente fiscal inválido: "${String(value ?? '')}". Valores permitidos: HOMOLOGACAO ou PRODUCAO.`
  )
}

export function toNumeracaoView(data: EmissaoResponse): NumeracaoView {
  const modelo = Number(data.modelo)
  const ambiente = normalizeAmbiente(data.ambiente)
  const serie = Number(data.serie ?? 1)
  const proximoNumero = Number(data.proximoNumero ?? data.numeroInicial ?? 1)
  const ativo = Boolean(data.ativo)

  return {
    id: `${modelo}-${ambiente}-${serie}`,
    modelo,
    serie,
    proximoNumero,
    numeroInicial: data.numeroInicial ?? proximoNumero,
    ativo,
    terminalId: null,
    nfeAtivo: modelo === 55 ? ativo : undefined,
    nfceAtivo: modelo === 65 ? ativo : undefined,
    nfceCscId: data.nfceCscId || undefined,
    nfceCscCodigo: data.nfceCscCodigo || undefined,
    ambiente,
  }
}

/**
 * Monta o JSON enviado ao microserviço. O OpenAPI documenta `ambiente` no body;
 * sem esse campo, alguns backends aplicam a alteração só em produção mesmo com ?ambiente= na URL.
 */
export function buildEmissaoPayload(
  body: any,
  modelo: number,
  ambiente: AmbienteFiscal,
  fallbackSerie?: number
) {
  return {
    serie: Number(body?.serie ?? fallbackSerie ?? 1),
    numeroInicial: Number(body?.numeroInicial),
    ativo: modelo === 55 ? Boolean(body?.nfeAtivo) : Boolean(body?.nfceAtivo),
    ambiente,
    nfceCscId: body?.nfceCscId || undefined,
    nfceCscCodigo: body?.nfceCscCodigo || undefined,
  }
}

