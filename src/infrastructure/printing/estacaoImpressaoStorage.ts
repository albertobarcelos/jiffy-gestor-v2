const ESTACAO_IMPRESSAO_ID_STORAGE_KEY = 'gestor-estacao-impressao-id'

export function getEstacaoImpressaoId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const id = window.localStorage.getItem(ESTACAO_IMPRESSAO_ID_STORAGE_KEY)?.trim()
    return id || null
  } catch {
    return null
  }
}

export function salvarEstacaoImpressaoId(id: string): void {
  if (typeof window === 'undefined') return
  const value = id.trim()
  if (!value) return
  try {
    window.localStorage.setItem(ESTACAO_IMPRESSAO_ID_STORAGE_KEY, value)
    window.dispatchEvent(new Event('jiffy:estacao-impressao-changed'))
  } catch {
    /* storage indisponível */
  }
}

export function limparEstacaoImpressaoId(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(ESTACAO_IMPRESSAO_ID_STORAGE_KEY)
    window.dispatchEvent(new Event('jiffy:estacao-impressao-changed'))
  } catch {
    /* storage indisponível */
  }
}
