import type {
  AtualizarClienteDeliveryPublicoInput,
  ClienteDeliveryPublicoDTO,
  CotacaoPedidoPublicoInput,
  CreatePedidoPublicoInput,
  CreatePedidoPublicoResponseDTO,
  CriarClienteDeliveryPublicoInput,
  GetCatalogoPublicoResponseDTO,
  GetMeiosPagamentoPublicosResponseDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { parseCreatePedidoPublicoResponse } from '@/src/application/dto/delivery-publico/CreatePedidoPublicoResponseDTO'
import {
  parseCotacaoPedidoPublicoFromErrorBody,
  parseCotacaoPedidoPublicoResponse,
  type CotacaoPedidoPublicoDTO,
} from '@/src/application/dto/delivery-publico/CotacaoPedidoPublicoDTO'

export class PublicDeliveryApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown
  ) {
    super(message)
    this.name = 'PublicDeliveryApiError'
  }
}

export class CotacaoDesatualizadaPublicDeliveryError extends PublicDeliveryApiError {
  readonly cotacao: CotacaoPedidoPublicoDTO

  constructor(message: string, cotacao: CotacaoPedidoPublicoDTO, details?: unknown) {
    super(message, 409, details)
    this.name = 'CotacaoDesatualizadaPublicDeliveryError'
    this.cotacao = cotacao
  }
}

export function isCotacaoDesatualizadaError(
  error: unknown
): error is CotacaoDesatualizadaPublicDeliveryError {
  return error instanceof CotacaoDesatualizadaPublicDeliveryError
}

/** Loja delivery indisponível (pendências de configuração). */
export function isEmpresaDeliveryIndisponivel(error: unknown): boolean {
  return error instanceof PublicDeliveryApiError && error.status === 403
}

function extrairPendenciasDoCorpoErro(body: unknown): string[] {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return []
  const raiz = body as Record<string, unknown>

  const candidatos: unknown[] = []
  if (raiz.details && typeof raiz.details === 'object') {
    candidatos.push((raiz.details as Record<string, unknown>).details)
    candidatos.push(raiz.details)
  }
  candidatos.push(raiz)

  for (const bloco of candidatos) {
    if (!bloco || typeof bloco !== 'object' || Array.isArray(bloco)) continue
    const pendencias = (bloco as Record<string, unknown>).pendencias
    if (!Array.isArray(pendencias)) continue
    const mensagens = pendencias
      .map(item => {
        if (!item || typeof item !== 'object') return null
        const msg = (item as Record<string, unknown>).message
        return typeof msg === 'string' && msg.trim() ? msg.trim() : null
      })
      .filter((msg): msg is string => Boolean(msg))
    if (mensagens.length) return mensagens
  }

  return []
}

/** Mensagens de pendência quando o catálogo público retorna 403. */
export function extrairMensagensPendenciasCatalogo(error: unknown): string[] {
  if (!(error instanceof PublicDeliveryApiError)) return []
  const fromDetails = extrairPendenciasDoCorpoErro(error.details)
  if (fromDetails.length) return fromDetails
  return error.message ? [error.message] : []
}

export function isPublicDeliverySlugNotFound(error: unknown): boolean {
  return (
    error instanceof PublicDeliveryApiError &&
    error.status === 404 &&
    error.message.toLowerCase().includes('empresa delivery')
  )
}

function parseErrorMessageFromBody(body: unknown, status: number): string {
  if (status === 429) {
    return formatarMensagemErroCotacaoPublica(429)
  }

  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const o = body as Record<string, unknown>
    if (typeof o.message === 'string' && o.message.trim()) {
      return formatarMensagemErroCotacaoPublica(status, o.message.trim())
    }
    if (typeof o.error === 'string' && o.error.trim()) {
      return formatarMensagemErroCotacaoPublica(status, o.error.trim())
    }
    if (o.details && typeof o.details === 'object') {
      const d = o.details as Record<string, unknown>
      if (typeof d.message === 'string' && d.message.trim()) {
        return formatarMensagemErroCotacaoPublica(status, d.message.trim())
      }
    }
  }
  return formatarMensagemErroCotacaoPublica(status)
}

/** Mensagem ao cliente externo quando o endereço está fora da cobertura de entrega. */
export const MSG_FORA_COBERTURA_ENTREGA_PUBLICA =
  'Seu endereço está fora da nossa área de cobertura para entrega. Você ainda pode retirar o pedido na loja.'

export function isErroCoberturaEntregaPublica(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    message === MSG_FORA_COBERTURA_ENTREGA_PUBLICA ||
    lower.includes('cobertura') ||
    lower.includes('fora da área') ||
    lower.includes('fora da area') ||
    lower.includes('fora do raio') ||
    lower.includes('raio de entrega') ||
    lower.includes('área de entrega') ||
    lower.includes('area de entrega') ||
    lower.includes('coberto por nenhuma') ||
    lower.includes('não atend') ||
    lower.includes('nao atend')
  )
}

/** Mensagens amigáveis para falhas na cotação pública (inclui rate limit 429). */
export function formatarMensagemErroCotacaoPublica(
  status: number,
  rawMessage?: string | null
): string {
  const msg = rawMessage?.trim() ?? ''

  if (status === 429) {
    return 'Muitas tentativas de calcular o frete. Aguarde cerca de 1 minuto e tente novamente.'
  }

  if (msg) {
    const lower = msg.toLowerCase()
    if (lower.includes('geolocalização') || lower.includes('geolocalizacao')) {
      return 'Este endereço ainda não tem localização para entrega. Escolha outro endereço ou cadastre um novo.'
    }
    if (lower.includes('cardápio delivery') || lower.includes('cardapio delivery')) {
      return 'O cardápio de delivery está indisponível no momento. Tente novamente mais tarde.'
    }
    if (isErroCoberturaEntregaPublica(msg)) {
      return MSG_FORA_COBERTURA_ENTREGA_PUBLICA
    }
    return msg
  }

  if (status === 400) {
    return 'Não foi possível calcular o frete com os dados informados. Verifique o endereço ou tente retirada no local.'
  }

  if (status === 403) {
    return 'A loja não está disponível para pedidos no momento.'
  }

  if (status >= 500) {
    return 'Não foi possível calcular o frete agora. Tente novamente em instantes.'
  }

  return status > 0 ? `Não foi possível calcular o frete (erro ${status}).` : 'Não foi possível calcular o frete.'
}

async function parseErrorMessage(res: Response): Promise<string> {
  const body = await parseErrorBody(res)
  return parseErrorMessageFromBody(body, res.status)
}

async function parseErrorBody(res: Response): Promise<unknown> {
  try {
    return await res.json()
  } catch {
    return null
  }
}

function extrairCotacaoDoErro(body: unknown): CotacaoPedidoPublicoDTO | null {
  if (!body || typeof body !== 'object') return null
  const o = body as Record<string, unknown>
  const fromDetails =
    o.details && typeof o.details === 'object'
      ? parseCotacaoPedidoPublicoFromErrorBody(o.details)
      : null
  if (fromDetails) return fromDetails
  return parseCotacaoPedidoPublicoFromErrorBody(body)
}

export async function fetchEmpresaPublicaMidia(slug: string): Promise<{
  logoUrl: string | null
  bannerUrl: string | null
}> {
  const data = await fetchCatalogoPublico(slug, { limit: 1, offset: 0 })
  return {
    logoUrl: data.empresa.logoUrl ?? null,
    bannerUrl: data.empresa.bannerUrl ?? null,
  }
}

export async function fetchCatalogoPublico(
  slug: string,
  params?: { offset?: number; limit?: number }
): Promise<GetCatalogoPublicoResponseDTO> {
  const search = new URLSearchParams()
  if (params?.offset != null) search.set('offset', String(params.offset))
  if (params?.limit != null) search.set('limit', String(params.limit))
  const qs = search.toString()
  const url = `/api/public/delivery/catalogo/${encodeURIComponent(slug)}${qs ? `?${qs}` : ''}`

  const res = await fetch(url, { cache: 'no-store' })
  const body = await parseErrorBody(res)
  if (!res.ok) {
    throw new PublicDeliveryApiError(
      parseErrorMessageFromBody(body, res.status),
      res.status,
      body
    )
  }
  return body as GetCatalogoPublicoResponseDTO
}

export async function fetchMeiosPagamentoPublicos(
  slug: string
): Promise<GetMeiosPagamentoPublicosResponseDTO> {
  const url = `/api/public/delivery/meios-pagamento/${encodeURIComponent(slug)}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    throw new PublicDeliveryApiError(await parseErrorMessage(res), res.status)
  }
  return res.json()
}

export async function cotarPedidoPublico(
  input: CotacaoPedidoPublicoInput
): Promise<CotacaoPedidoPublicoDTO> {
  const res = await fetch('/api/public/delivery/cotacao', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const body = await parseErrorBody(res)
    throw new PublicDeliveryApiError(
      parseErrorMessageFromBody(body, res.status),
      res.status,
      body
    )
  }
  return parseCotacaoPedidoPublicoResponse(await res.json())
}

export async function criarPedidoPublico(
  input: CreatePedidoPublicoInput
): Promise<CreatePedidoPublicoResponseDTO> {
  const res = await fetch('/api/public/delivery/pedidos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const body = await parseErrorBody(res)
    const message = parseErrorMessageFromBody(body, res.status)
    if (res.status === 409) {
      const cotacao = extrairCotacaoDoErro(body)
      if (cotacao) {
        throw new CotacaoDesatualizadaPublicDeliveryError(message, cotacao, body)
      }
    }
    throw new PublicDeliveryApiError(message, res.status, body)
  }
  return parseCreatePedidoPublicoResponse(await res.json())
}

/**
 * Busca cliente delivery por telefone (rota pública).
 * Retorna `null` em 404 (cliente ainda não cadastrado).
 */
export async function buscarClienteDeliveryPublico(
  telefone: string
): Promise<ClienteDeliveryPublicoDTO | null> {
  const tel = telefone.replace(/\D/g, '')
  const res = await fetch(
    `/api/public/delivery/clientes/${encodeURIComponent(tel)}`,
    { cache: 'no-store', headers: { Accept: 'application/json' } }
  )
  if (res.status === 404) return null
  if (!res.ok) {
    throw new PublicDeliveryApiError(await parseErrorMessage(res), res.status)
  }
  return res.json()
}

export async function criarClienteDeliveryPublico(
  input: CriarClienteDeliveryPublicoInput
): Promise<ClienteDeliveryPublicoDTO> {
  const res = await fetch('/api/public/delivery/clientes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    throw new PublicDeliveryApiError(await parseErrorMessage(res), res.status)
  }
  return res.json()
}

export async function atualizarClienteDeliveryPublico(
  telefone: string,
  input: AtualizarClienteDeliveryPublicoInput
): Promise<ClienteDeliveryPublicoDTO> {
  const tel = telefone.replace(/\D/g, '')
  const res = await fetch(
    `/api/public/delivery/clientes/${encodeURIComponent(tel)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(input),
    }
  )
  if (!res.ok) {
    throw new PublicDeliveryApiError(await parseErrorMessage(res), res.status)
  }
  return res.json()
}
