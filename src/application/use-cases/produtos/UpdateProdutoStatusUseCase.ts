export interface UpdateProdutoStatusInput {
  produtoId: string
  novoStatus: boolean
  token: string
}

export async function updateProdutoStatus({ produtoId, novoStatus, token }: UpdateProdutoStatusInput): Promise<void> {
  const response = await fetch(`/api/produtos/${produtoId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ativo: novoStatus }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.message || 'Erro ao atualizar status do produto')
  }
}
