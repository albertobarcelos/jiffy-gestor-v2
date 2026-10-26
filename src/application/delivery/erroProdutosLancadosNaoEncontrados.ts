function textoErro(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message
  if (typeof error === 'string') return error
  if (!error || typeof error !== 'object') return ''
  const corpo = error as { message?: unknown; error?: unknown; response?: { data?: unknown } }
  const data = corpo.response?.data
  if (data && typeof data === 'object') {
    const payload = data as { message?: unknown; error?: unknown }
    if (typeof payload.message === 'string' && payload.message.trim()) return payload.message
    if (typeof payload.error === 'string' && payload.error.trim()) return payload.error
  }
  if (typeof corpo.message === 'string' && corpo.message.trim()) return corpo.message
  if (typeof corpo.error === 'string' && corpo.error.trim()) return corpo.error
  return ''
}

/** Backend recusou o `remove` porque o item lançado já não está no pedido. */
export function isErroProdutosLancadosNaoEncontrados(error: unknown): boolean {
  return /não encontrados para remoção/i.test(textoErro(error))
}
