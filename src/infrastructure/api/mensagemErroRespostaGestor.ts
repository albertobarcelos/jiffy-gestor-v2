/** Corpo JSON comum em erros do BFF / Nest (`error`, `message`, `title`). */
export function mensagemErroRespostaGestor(
  payload: unknown,
  status: number,
  fallback: string
): string {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const o = payload as Record<string, unknown>
    for (const key of ['error', 'message', 'title'] as const) {
      const v = o[key]
      if (typeof v === 'string' && v.trim()) return v.trim()
    }
  }
  return `${fallback} (${status})`
}
