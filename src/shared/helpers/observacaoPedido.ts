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
  if (!observacoes) return ''

  if (!Array.isArray(observacoes)) {
    if (typeof observacoes === 'string') return observacoes.trim()
    if (typeof observacoes === 'object' && 'observacao' in observacoes) {
      return String((observacoes as { observacao?: string }).observacao ?? '').trim()
    }
    return ''
  }

  if (observacoes.length === 0) return ''

  const textos = observacoes
    .map(item => {
      if (typeof item === 'string') return item.trim()
      if (item && typeof item === 'object' && 'observacao' in item) {
        return String((item as { observacao?: string }).observacao ?? '').trim()
      }
      return ''
    })
    .filter(Boolean)

  return textos.join(' · ')
}

export function textoObservacaoProdutoApi(prod: Record<string, unknown>): string {
  const fromObservacoes = textoFromObservacoesApi(prod.observacoes)
  if (fromObservacoes) return fromObservacoes

  const fromObservacoesLancadas = textoFromObservacoesApi(prod.observacoesLancadas)
  if (fromObservacoesLancadas) return fromObservacoesLancadas

  if (prod.observacao != null) {
    return String(prod.observacao).trim()
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
