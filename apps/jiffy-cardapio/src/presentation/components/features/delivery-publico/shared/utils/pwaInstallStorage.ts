const DISMISS_PREFIX = 'jiffy-cardapio:pwa-install-dismissed:'
const VISIT_PREFIX = 'jiffy-cardapio:pwa-visits:'

/** Reexibir sugestão após dismiss curto (“Não agora”). */
export const PWA_INSTALL_DISMISS_CURTO_MS = 10 * 24 * 60 * 60 * 1000

/** “Não mostrar de novo” — ~2 anos. */
export const PWA_INSTALL_DISMISS_LONGO_MS = 730 * 24 * 60 * 60 * 1000

type DismissPayload = {
  until: number
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function dismissKey(slug: string): string {
  return `${DISMISS_PREFIX}${slug.trim().toLowerCase()}`
}

function visitKey(slug: string): string {
  return `${VISIT_PREFIX}${slug.trim().toLowerCase()}`
}

export function pwaInstallEstaDismissed(slug: string, agora = Date.now()): boolean {
  if (!isBrowser()) return false
  const slugNorm = slug.trim()
  if (!slugNorm) return false
  try {
    const raw = window.localStorage.getItem(dismissKey(slugNorm))
    if (!raw) return false
    const parsed = JSON.parse(raw) as DismissPayload
    if (!parsed?.until || typeof parsed.until !== 'number') return false
    return parsed.until > agora
  } catch {
    return false
  }
}

export function dismissPwaInstall(slug: string, duracaoMs: number, agora = Date.now()): void {
  if (!isBrowser()) return
  const slugNorm = slug.trim()
  if (!slugNorm) return
  try {
    const payload: DismissPayload = { until: agora + duracaoMs }
    window.localStorage.setItem(dismissKey(slugNorm), JSON.stringify(payload))
  } catch {
    // ignore
  }
}

/** Incrementa e devolve o total de visitas deste slug neste dispositivo. */
export function registrarVisitaPwaSlug(slug: string): number {
  if (!isBrowser()) return 0
  const slugNorm = slug.trim()
  if (!slugNorm) return 0
  try {
    const key = visitKey(slugNorm)
    const atual = Number(window.localStorage.getItem(key) || '0')
    const next = (Number.isFinite(atual) && atual > 0 ? atual : 0) + 1
    window.localStorage.setItem(key, String(next))
    return next
  } catch {
    return 0
  }
}

export function lerVisitasPwaSlug(slug: string): number {
  if (!isBrowser()) return 0
  const slugNorm = slug.trim()
  if (!slugNorm) return 0
  try {
    const n = Number(window.localStorage.getItem(visitKey(slugNorm)) || '0')
    return Number.isFinite(n) && n > 0 ? n : 0
  } catch {
    return 0
  }
}
