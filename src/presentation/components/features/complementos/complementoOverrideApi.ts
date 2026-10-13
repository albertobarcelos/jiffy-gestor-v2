import type { ComplementoCompleto } from '@/src/domain/complemento/tipos'
import type {
  ImpactoComplementoNoGrupo,
  ResultadoOverridesComplemento,
  VinculoComplementoOverride,
} from '@/src/domain/repositories/IComplementoOverrideRepository'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'

async function tokenOuErro(): Promise<string> {
  const token = useAuthStore.getState().tenantAuth?.getAccessToken()
  if (!token) {
    throw new Error('Token não encontrado. Faça login novamente.')
  }
  return token
}

async function lerErro(response: Response, fallback: string): Promise<never> {
  const errorData = await response.json().catch(() => ({}))
  const details = errorData as { message?: string; error?: string }
  throw new Error(details.message || details.error || fallback)
}

export async function buscarComplementoCompleto(complementoId: string): Promise<ComplementoCompleto> {
  const token = await tokenOuErro()
  const response = await fetchGestorApi(
    `/api/complementos/${encodeURIComponent(complementoId)}?retorno=completo`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    }
  )
  if (!response.ok) {
    await lerErro(response, 'Erro ao carregar usos do complemento')
  }
  return response.json() as Promise<ComplementoCompleto>
}

export async function gravarOverridesComplemento(input: {
  vinculos?: VinculoComplementoOverride[]
  grupos?: ImpactoComplementoNoGrupo[]
}): Promise<ResultadoOverridesComplemento> {
  const token = await tokenOuErro()
  const response = await fetchGestorApi('/api/complementos/overrides', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    await lerErro(response, 'Erro ao salvar exceção do complemento')
  }
  return response.json() as Promise<ResultadoOverridesComplemento>
}
