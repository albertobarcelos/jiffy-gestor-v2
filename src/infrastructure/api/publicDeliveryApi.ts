import type {
  CreatePedidoPublicoInput,
  GetCatalogoPublicoResponseDTO,
  GetMeiosPagamentoPublicosResponseDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'

export class PublicDeliveryApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = 'PublicDeliveryApiError'
  }
}

/** Slug não cadastrado — loja delivery inexistente. */
export function isPublicDeliverySlugNotFound(error: unknown): boolean {
  return (
    error instanceof PublicDeliveryApiError &&
    error.status === 404 &&
    error.message.toLowerCase().includes('empresa delivery')
  )
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { message?: string; error?: string }
    return data.message || data.error || `Erro ${res.status}`
  } catch {
    return `Erro ${res.status}`
  }
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
    throw new PublicDeliveryApiError(await parseErrorMessage(res), res.status)
  }
  return res.json()
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

export async function criarPedidoPublico(
  input: CreatePedidoPublicoInput
): Promise<unknown> {
  const res = await fetch('/api/public/delivery/pedidos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    throw new PublicDeliveryApiError(await parseErrorMessage(res), res.status)
  }
  return res.json()
}
