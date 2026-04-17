export interface UpdateProdutoToggleInput {
  produtoId: string
  bodyKey: string
  novoValor: boolean
  token: string
}

export async function updateProdutoToggle({ produtoId, bodyKey, novoValor, token }: UpdateProdutoToggleInput): Promise<void> {
  const response = await fetch(`/api/produtos/${produtoId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ [bodyKey]: novoValor }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.message || 'Erro ao atualizar produto')
  }
}
