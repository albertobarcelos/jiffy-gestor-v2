import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import type { ProdutoPatch } from '@/src/shared/types/produto'

export interface UpdateProdutoPatchInput {
  produtoId: string
  patch: ProdutoPatch
  token: string
}

export async function updateProdutoPatch({ produtoId, patch, token }: UpdateProdutoPatchInput): Promise<void> {
  if (patch.nome !== undefined && patch.nome.trim() === '') {
    throw new Error('Informe um nome válido para o produto.')
  }
  if (patch.valor !== undefined && (Number.isNaN(patch.valor) || patch.valor < 0)) {
    throw new Error('Informe um valor válido para o produto.')
  }

  const { nomeGrupo: _nomeGrupo, ...apiPatch } = patch

  const response = await fetchGestorApi(`/api/produtos/${produtoId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(apiPatch),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.message || 'Erro ao atualizar produto')
  }
}
