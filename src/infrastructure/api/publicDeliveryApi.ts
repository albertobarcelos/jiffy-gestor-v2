import type {
  AtualizarClienteDeliveryPublicoInput,
  ClienteDeliveryPublicoDTO,
  CreatePedidoPublicoInput,
  CreatePedidoPublicoResponseDTO,
  CriarClienteDeliveryPublicoInput,
  GetCatalogoPublicoResponseDTO,
  GetMeiosPagamentoPublicosResponseDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import type { DisponibilidadeDeliveryDTO } from '@/src/application/dto/delivery-publico/DisponibilidadeDeliveryDTO'
import type { HorarioFuncionamentoPublicoDTO } from '@/src/application/dto/delivery-publico/HorarioFuncionamentoPublicoDTO'
import { parseCreatePedidoPublicoResponse } from '@/src/application/dto/delivery-publico/CreatePedidoPublicoResponseDTO'

export class PublicDeliveryApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string
  ) {
    super(message)
    this.name = 'PublicDeliveryApiError'
  }
}

/** Slot atingiu o limite de pedidos agendados. */
export function isPublicDeliverySlotLotado(error: unknown): boolean {
  if (!(error instanceof PublicDeliveryApiError)) return false
  if (error.code === 'SLOT_LOTADO') return true
  return /limite de pedidos|SLOT_LOTADO/i.test(error.message)
}

/** Slug não cadastrado — loja delivery inexistente. */
export function isPublicDeliverySlugNotFound(error: unknown): boolean {
  return (
    error instanceof PublicDeliveryApiError &&
    error.status === 404 &&
    error.message.toLowerCase().includes('empresa delivery')
  )
}

async function parseErrorMessage(
  res: Response
): Promise<{ message: string; code?: string }> {
  try {
    const data = (await res.json()) as {
      message?: string
      error?: string
      details?: { code?: string }
      code?: string
    }
    return {
      message: data.message || data.error || `Erro ${res.status}`,
      code: data.details?.code || data.code,
    }
  } catch {
    return { message: `Erro ${res.status}` }
  }
}

async function throwPublicDeliveryApiError(res: Response): Promise<never> {
  const parsed = await parseErrorMessage(res)
  throw new PublicDeliveryApiError(parsed.message, res.status, parsed.code)
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
  if (!res.ok) {
    throw await throwPublicDeliveryApiError(res)
  }
  return res.json()
}

export async function fetchMeiosPagamentoPublicos(
  slug: string
): Promise<GetMeiosPagamentoPublicosResponseDTO> {
  const url = `/api/public/delivery/meios-pagamento/${encodeURIComponent(slug)}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    throw await throwPublicDeliveryApiError(res)
  }
  return res.json()
}

export async function fetchDisponibilidadePublica(
  slug: string,
  params: { tipoEntrega: 'entrega' | 'retirada'; data?: string }
): Promise<DisponibilidadeDeliveryDTO> {
  const search = new URLSearchParams()
  search.set('tipoEntrega', params.tipoEntrega)
  if (params.data) search.set('data', params.data)
  const url = `/api/public/delivery/disponibilidade/${encodeURIComponent(slug)}?${search.toString()}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    throw await throwPublicDeliveryApiError(res)
  }
  return res.json()
}

export async function fetchHorarioFuncionamentoPublico(
  slug: string
): Promise<HorarioFuncionamentoPublicoDTO> {
  const url = `/api/public/delivery/horario-funcionamento/${encodeURIComponent(slug)}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    throw await throwPublicDeliveryApiError(res)
  }
  return res.json()
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
    throw await throwPublicDeliveryApiError(res)
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
    throw await throwPublicDeliveryApiError(res)
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
    throw await throwPublicDeliveryApiError(res)
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
    throw await throwPublicDeliveryApiError(res)
  }
  return res.json()
}
