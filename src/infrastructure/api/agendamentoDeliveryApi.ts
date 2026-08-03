import {
  agendamentoDeliveryConfigSchema,
  type AgendamentoDeliveryConfigDTO,
  type UpdateAgendamentoDeliveryConfigInput,
} from '@/src/application/dto/delivery/AgendamentoDeliveryDTO'
import { textoErroCorpoApi } from '@/src/infrastructure/api/apiClient'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'

const AGENDAMENTO_ME_PATH = '/api/delivery/empresas/me/agendamento'

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

function parseConfig(data: unknown): AgendamentoDeliveryConfigDTO {
  return agendamentoDeliveryConfigSchema.parse(data)
}

export async function buscarAgendamentoDeliveryConfig(
  token: string
): Promise<AgendamentoDeliveryConfigDTO | null> {
  const res = await fetchGestorApi(AGENDAMENTO_ME_PATH, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 404) return null
  const data = await parseJsonOrThrow(res)
  return parseConfig(data)
}

export async function salvarAgendamentoDeliveryConfig(
  token: string,
  input: UpdateAgendamentoDeliveryConfigInput
): Promise<AgendamentoDeliveryConfigDTO> {
  const res = await fetchGestorApi(AGENDAMENTO_ME_PATH, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })
  const data = await parseJsonOrThrow(res)
  return parseConfig(data)
}
