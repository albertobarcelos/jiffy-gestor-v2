/**
 * Lê o corpo de um `fetch` como JSON sem lançar SyntaxError.
 * Útil quando o Next devolve HTML ou texto ("Internal Server Error") em vez de JSON.
 */
export async function readFetchJson<T extends Record<string, unknown>>(
  response: Response
): Promise<{ data: T; parseFailed: boolean }> {
  const text = await response.text()
  if (!text.trim()) {
    return { data: {} as T, parseFailed: true }
  }
  try {
    const parsed = JSON.parse(text) as T
    return { data: parsed, parseFailed: false }
  } catch {
    return { data: {} as T, parseFailed: true }
  }
}

export function mensagemErroRespostaNaoJson(status: number): string {
  if (status >= 500) {
    return 'Servidor indisponível. Se estiver em desenvolvimento, pare o `npm run dev`, apague a pasta `.next` e inicie de novo.'
  }
  return `Resposta inválida do servidor (HTTP ${status}). Tente novamente.`
}
