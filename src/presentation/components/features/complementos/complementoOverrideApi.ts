import type { GrupoComplementoLote } from '@/src/application/complementos/menuComplementoLote'
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

export async function listarGruposComplementoMenuLote(menuId: string): Promise<GrupoComplementoLote[]> {
  const token = await tokenOuErro()
  const response = await fetchGestorApi(
    `/api/menus/${encodeURIComponent(menuId)}/grupos-complementos-lote`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    }
  )
  if (!response.ok) {
    await lerErro(response, 'Erro ao carregar grupos de complementos do cardápio')
  }
  const data = (await response.json()) as { grupos?: GrupoComplementoLote[] }
  return Array.isArray(data.grupos) ? data.grupos : []
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

async function patchReordenacaoNoMenu(
  menuId: string,
  produtoId: string,
  acao: 'reordena-grupo-complemento' | 'reordena-complemento',
  body: Record<string, unknown>,
  mensagemErro: string
): Promise<void> {
  const token = await tokenOuErro()
  const response = await fetchGestorApi(
    `/api/menus/${encodeURIComponent(menuId)}/produtos/${encodeURIComponent(produtoId)}/${acao}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )
  if (!response.ok) {
    await lerErro(response, mensagemErro)
  }
}

export async function reordenarGrupoComplementoNoMenu(input: {
  menuId: string
  produtoId: string
  grupoComplementoId: string
  novaPosicao: number
}): Promise<void> {
  await patchReordenacaoNoMenu(
    input.menuId,
    input.produtoId,
    'reordena-grupo-complemento',
    {
      novaPosicao: input.novaPosicao,
      grupoComplementoId: input.grupoComplementoId,
    },
    'Erro ao reordenar grupo de complementos'
  )
}

export async function reordenarComplementoNoMenu(input: {
  menuId: string
  produtoId: string
  grupoComplementoId: string
  complementoId: string
  novaPosicao: number
}): Promise<void> {
  await patchReordenacaoNoMenu(
    input.menuId,
    input.produtoId,
    'reordena-complemento',
    {
      novaPosicao: input.novaPosicao,
      grupoComplementoId: input.grupoComplementoId,
      complementoId: input.complementoId,
    },
    'Erro ao reordenar complemento'
  )
}
