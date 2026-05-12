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

/**
 * Access token da empresa **desta aba** (isolamento multi-empresa por guia).
 * Gravado ao escolher empresa; lido pelo AuthGuard e utils de fetch.
 */
export const SESSION_STORAGE_TENANT_TOKEN = 'jiffy:tenant-token'

/**
 * Nonce gerado pelo hub ao abrir aba de empresa. Usado pelo AuthGuard para
 * rejeitar abas abertas via digitação direta de URL (sem passar pelo hub).
 */
export const SESSION_STORAGE_SESSION_NONCE = 'jiffy:session-nonce'

/**
 * Slug cosmético da empresa exibido na URL (ex: `nexsyn-ab12cd34`).
 * Gravado ao consumir sessão; lido por `useEmpresaQueryParam` para manter
 * `?emp=slug` em toda navegação interna do ERP.
 */
export const SESSION_STORAGE_EMPRESA_SLUG = 'jiffy:empresa-slug'
