export interface UpdateProdutoValorInput {
  produtoId: string
  novoValor: number
  token: string
}

export async function updateProdutoValor({ produtoId, novoValor, token }: UpdateProdutoValorInput): Promise<void> {
  if (Number.isNaN(novoValor) || novoValor < 0) {
    throw new Error('Informe um valor válido para o produto.')
  }

  const response = await fetch(`/api/produtos/${produtoId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ valor: novoValor }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.message || 'Erro ao atualizar valor do produto')
  }
}
