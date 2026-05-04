export interface UpdateGrupoProdutoStatusInput {
  grupoId: string
  novoStatus: boolean
  token: string
}

export async function updateGrupoProdutoStatus({ grupoId, novoStatus, token }: UpdateGrupoProdutoStatusInput): Promise<void> {
  const response = await fetch(`/api/grupos-produtos/${grupoId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ativo: novoStatus }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.message || 'Erro ao atualizar status do grupo')
  }
}
