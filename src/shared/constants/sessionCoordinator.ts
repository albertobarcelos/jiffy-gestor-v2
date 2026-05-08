/** Canal único para ping hub ↔ abas do ERP (mesma origem). */
export const JIFFY_SESSION_BROADCAST_CHANNEL = 'jiffy-session-coordinator'

/**
 * Marca que esta guia iniciou o logout da empresa (evita modal “desconectado” na própria guia).
 */
export const SESSION_STORAGE_TENANT_LOGOUT_SELF = 'jiffy:tenant-logout-self'

/**
 * Marca que esta guia iniciou o logout do hub (evita redirect imediato do AuthGuard antes de `window.close()`).
 */
export const SESSION_STORAGE_HUB_LOGOUT_SELF = 'jiffy:hub-logout-self'
