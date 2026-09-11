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
import {
  CotacaoDesatualizadaPublicDeliveryError,
  formatarMensagemErroCotacaoPublica,
  PublicDeliveryApiError,
} from '@/src/application/errors/publicDeliveryErrors'

export {
  CotacaoDesatualizadaPublicDeliveryError,
  EMPRESA_DELIVERY_FECHADA_CODE,
  extrairMensagensPendenciasCatalogo,
  formatarMensagemErroCotacaoPublica,
  isCotacaoDesatualizadaError,
  isEmpresaDeliveryFechadaError,
  isEmpresaDeliveryIndisponivel,
  isErroCoberturaEntregaPublica,
  isPublicDeliverySlugNotFound,
  MSG_FORA_COBERTURA_ENTREGA_PUBLICA,
  PublicDeliveryApiError,
} from '@/src/application/errors/publicDeliveryErrors'

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

  const res = await fetch(url, {
    // Permite aproveitar Cache-Control do BFF (s-maxage / SWR).
    headers: { Accept: 'application/json' },
  })
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
