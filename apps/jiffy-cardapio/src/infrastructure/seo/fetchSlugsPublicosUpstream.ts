import { ApiClient } from '@/src/infrastructure/api/apiClient'
import { parseSlugsPublicos } from './parseSlugsPublicos'

export const SLUGS_PUBLICOS_PATH = '/api/v1/delivery/slugs-publicos'
export const SLUGS_PUBLICOS_REVALIDATE_SECONDS = 60 * 60

/**
 * Lista pública de slugs com delivery ativo.
 * Fonte: backend (Wilcker). Sem JWT — só slug, nada de dados da empresa.
 */
export async function fetchSlugsPublicosUpstream(): Promise<string[]> {
  const apiClient = new ApiClient()
  try {
    const response = await apiClient.request<unknown>(SLUGS_PUBLICOS_PATH, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      next: {
        revalidate: SLUGS_PUBLICOS_REVALIDATE_SECONDS,
        tags: ['slugs-publicos'],
      },
    })
    return parseSlugsPublicos(response.data)
  } catch {
    return []
  }
}
