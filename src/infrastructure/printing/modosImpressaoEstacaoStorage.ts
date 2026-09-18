import { parseModoImpressaoImpressora, type ModoImpressaoImpressora } from '@/src/domain/types/modoImpressaoImpressora'

const KEY_PREFIX = 'gestor-estacao-impressao-modos'

function storageKey(estacaoId: string): string {
  return `${KEY_PREFIX}:${estacaoId}`
}

export function lerModosImpressaoEstacaoLocal(
  estacaoId: string | null | undefined
): Record<string, ModoImpressaoImpressora> {
  if (typeof window === 'undefined') return {}
  const id = estacaoId?.trim()
  if (!id) return {}

  try {
    const raw = window.localStorage.getItem(storageKey(id))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const result: Record<string, ModoImpressaoImpressora> = {}
    for (const [impressoraId, modo] of Object.entries(parsed as Record<string, unknown>)) {
      const key = impressoraId.trim()
      if (!key) continue
      result[key] = parseModoImpressaoImpressora(modo)
    }
    return result
  } catch {
    return {}
  }
}

export function salvarModosImpressaoEstacaoLocal(
  estacaoId: string | null | undefined,
  modos: Record<string, ModoImpressaoImpressora | undefined>
): void {
  if (typeof window === 'undefined') return
  const id = estacaoId?.trim()
  if (!id) return

  const payload: Record<string, ModoImpressaoImpressora> = {}
  for (const [impressoraId, modo] of Object.entries(modos)) {
    const key = impressoraId.trim()
    if (!key) continue
    payload[key] = parseModoImpressaoImpressora(modo)
  }

  try {
    window.localStorage.setItem(storageKey(id), JSON.stringify(payload))
  } catch {
    /* storage indisponível */
  }
}
