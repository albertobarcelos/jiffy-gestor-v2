import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import type { GetCatalogoPublicoResponseDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { CATALOGO_GRUPOS_PAGE_LIMIT } from '@/src/presentation/hooks/publicDeliveryCatalogKeys'

/**
 * Busca catálogo direto no backend (server-side / RSC).
 * Evita round-trip pelo BFF relativo `/api/public/...` no servidor.
 */
export async function fetchCatalogoPublicoUpstream(
  slug: string,
  params?: { offset?: number; limit?: number }
): Promise<GetCatalogoPublicoResponseDTO> {
  const slugNormalizado = slug.trim()
  if (!slugNormalizado) {
    throw new Error('Slug é obrigatório')
  }

  const offset = params?.offset ?? 0
  const limit = params?.limit ?? CATALOGO_GRUPOS_PAGE_LIMIT
  const search = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
  })

  const apiClient = new ApiClient()
  try {
    const response = await apiClient.request<GetCatalogoPublicoResponseDTO>(
      `/api/v1/delivery/catalogo/${encodeURIComponent(slugNormalizado)}?${search}`,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      }
    )
    if (!response.data) {
      throw new Error('Catálogo vazio')
    }
    return response.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw error
  }
}
