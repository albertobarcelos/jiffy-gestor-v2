export const OBSERVACAO_PEDIDO_MIN_CHARS = 3
export const OBSERVACAO_PEDIDO_MAX_CHARS = 100

/** Vazio é válido; preenchido exige 3–100 caracteres (trim). */
export function observacaoTextoValidoParaEnvio(texto: string): boolean {
  const t = texto.trim()
  if (!t) return true
  return t.length >= OBSERVACAO_PEDIDO_MIN_CHARS && t.length <= OBSERVACAO_PEDIDO_MAX_CHARS
}

export function observacaoTextoParcialInvalido(texto: string): boolean {
  const t = texto.trim()
  return t.length > 0 && t.length < OBSERVACAO_PEDIDO_MIN_CHARS
}

export function observacoesArrayFromTexto(texto: string | undefined | null): string[] | undefined {
  const t = texto?.trim()
  if (!t) return undefined
  return [t]
}

export function textoFromObservacoesApi(observacoes: unknown): string {
  if (!Array.isArray(observacoes) || observacoes.length === 0) return ''
  const first = observacoes[0]
  if (typeof first === 'string') return first.trim()
  if (first && typeof first === 'object' && 'observacao' in first) {
    return String((first as { observacao?: string }).observacao ?? '').trim()
  }
  return ''
}

export function validarObservacoesPedido(params: {
  observacaoPedido?: string
  produtos: Array<{ nome: string; observacao?: string }>
}): { ok: true } | { ok: false; message: string } {
  if (
    params.observacaoPedido?.trim() &&
    !observacaoTextoValidoParaEnvio(params.observacaoPedido)
  ) {
    return {
      ok: false,
      message: 'Observação do pedido deve ter entre 3 e 100 caracteres.',
    }
  }

  for (const produto of params.produtos) {
    const obs = produto.observacao
    if (obs?.trim() && !observacaoTextoValidoParaEnvio(obs)) {
      return {
        ok: false,
        message: `Observação do item "${produto.nome}" deve ter entre 3 e 100 caracteres.`,
      }
    }
  }

  return { ok: true }
}
