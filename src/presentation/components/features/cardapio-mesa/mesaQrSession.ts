/** Sessão do cardápio mesa (QR) — prefixo isolado do delivery. */

export const MESA_QR_KEYS = {
  sessionToken: 'mesa_qr_session_token',
  mesaId: 'mesa_qr_mesa_id',
  numeroMesa: 'mesa_qr_numero_mesa',
  empresaId: 'mesa_qr_empresa_id',
  menuId: 'mesa_qr_menu_id',
} as const

export type MesaQrSession = {
  sessionToken: string
  mesaId: string
  numeroMesa: string
  empresaId: string
  menuId: string | null
}

export function gravarMesaQrSession(session: MesaQrSession): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(MESA_QR_KEYS.sessionToken, session.sessionToken)
  sessionStorage.setItem(MESA_QR_KEYS.mesaId, session.mesaId)
  sessionStorage.setItem(MESA_QR_KEYS.numeroMesa, session.numeroMesa)
  sessionStorage.setItem(MESA_QR_KEYS.empresaId, session.empresaId)
  if (session.menuId) {
    sessionStorage.setItem(MESA_QR_KEYS.menuId, session.menuId)
  } else {
    sessionStorage.removeItem(MESA_QR_KEYS.menuId)
  }
}

export function lerMesaQrSession(): MesaQrSession | null {
  if (typeof window === 'undefined') return null
  const sessionToken = sessionStorage.getItem(MESA_QR_KEYS.sessionToken)
  const mesaId = sessionStorage.getItem(MESA_QR_KEYS.mesaId)
  if (!sessionToken || !mesaId) return null
  return {
    sessionToken,
    mesaId,
    numeroMesa: sessionStorage.getItem(MESA_QR_KEYS.numeroMesa) || '?',
    empresaId: sessionStorage.getItem(MESA_QR_KEYS.empresaId) || '',
    menuId: sessionStorage.getItem(MESA_QR_KEYS.menuId),
  }
}

export function sessaoValidaParaMesa(mesaId: string): boolean {
  const session = lerMesaQrSession()
  return Boolean(session && session.mesaId === mesaId)
}
