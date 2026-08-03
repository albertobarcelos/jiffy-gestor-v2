import {
  deliveryPublicoDesignMeResponseSchema,
  type DeliveryPublicoDesignConfigDTO,
  type DeliveryPublicoDesignMeResponseDTO,
  type UpdateDeliveryPublicoDesignDraftInput,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'
import { textoErroCorpoApi } from '@/src/infrastructure/api/apiClient'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'

const DESIGN_ME_PATH = '/api/delivery/empresas/me/design'
const DESIGN_DRAFT_PATH = '/api/delivery/empresas/me/design/draft'
const DESIGN_PUBLISH_PATH = '/api/delivery/empresas/me/design/publish'

async function parseJsonOrThrow(res: Response): Promise<unknown> {
  const raw: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg =
      textoErroCorpoApi(raw) ||
      (raw &&
      typeof raw === 'object' &&
      'error' in raw &&
      typeof (raw as { error: unknown }).error === 'string'
        ? (raw as { error: string }).error
        : '') ||
      `Erro HTTP ${res.status}`
    throw new Error(msg)
  }
  return raw
}

function parseMeResponse(data: unknown): DeliveryPublicoDesignMeResponseDTO {
  return deliveryPublicoDesignMeResponseSchema.parse(data)
}

export async function buscarDesignDeliveryMe(
  token: string
): Promise<DeliveryPublicoDesignMeResponseDTO | null> {
  const res = await fetchGestorApi(DESIGN_ME_PATH, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 404) return null
  const data = await parseJsonOrThrow(res)
  return parseMeResponse(data)
}

export async function salvarDraftDesignDelivery(
  token: string,
  input: UpdateDeliveryPublicoDesignDraftInput
): Promise<DeliveryPublicoDesignMeResponseDTO> {
  const res = await fetchGestorApi(DESIGN_DRAFT_PATH, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })
  const data = await parseJsonOrThrow(res)
  return parseMeResponse(data)
}

export async function publicarDesignDelivery(
  token: string
): Promise<DeliveryPublicoDesignMeResponseDTO> {
  const res = await fetchGestorApi(DESIGN_PUBLISH_PATH, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await parseJsonOrThrow(res)
  return parseMeResponse(data)
}

/** Parse solto do config (útil em testes / normalização). */
export function parseDeliveryPublicoDesignConfig(
  data: unknown
): DeliveryPublicoDesignConfigDTO {
  return deliveryPublicoDesignConfigSchema.parse(data)
}
