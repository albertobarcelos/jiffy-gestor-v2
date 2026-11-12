/** Snooze do aviso de canal WhatsApp no Kanban (por empresa). */
export const WHATSAPP_KANBAN_AVISO_SNOOZE_KEY_PREFIX =
  'jiffy-gestor-v2:whatsapp-kanban-aviso-snooze'

export const WHATSAPP_KANBAN_AVISO_SNOOZE_MS = 5 * 24 * 60 * 60 * 1000

export function chaveSnoozeAvisoWhatsAppKanban(empresaId: string): string {
  return `${WHATSAPP_KANBAN_AVISO_SNOOZE_KEY_PREFIX}:${empresaId.trim()}`
}

export function lerSnoozeAte(empresaId: string): number | null {
  if (typeof window === 'undefined') return null
  const id = empresaId.trim()
  if (!id) return null
  try {
    const raw = window.localStorage.getItem(chaveSnoozeAvisoWhatsAppKanban(id))
    if (!raw) return null
    const ts = Number(raw)
    return Number.isFinite(ts) ? ts : null
  } catch {
    return null
  }
}

export function estaEmSnooze(empresaId: string, agora: number = Date.now()): boolean {
  const ate = lerSnoozeAte(empresaId)
  if (ate == null) return false
  if (ate <= agora) {
    limparSnooze(empresaId)
    return false
  }
  return true
}

export function gravarSnooze5Dias(
  empresaId: string,
  agora: number = Date.now()
): void {
  if (typeof window === 'undefined') return
  const id = empresaId.trim()
  if (!id) return
  try {
    window.localStorage.setItem(
      chaveSnoozeAvisoWhatsAppKanban(id),
      String(agora + WHATSAPP_KANBAN_AVISO_SNOOZE_MS)
    )
  } catch {
    // ignore quota / private mode
  }
}

export function limparSnooze(empresaId: string): void {
  if (typeof window === 'undefined') return
  const id = empresaId.trim()
  if (!id) return
  try {
    window.localStorage.removeItem(chaveSnoozeAvisoWhatsAppKanban(id))
  } catch {
    // ignore
  }
}
