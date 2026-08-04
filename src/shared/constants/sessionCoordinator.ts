/** Canal único para ping hub ↔ abas do ERP (mesma origem). */
export const JIFFY_SESSION_BROADCAST_CHANNEL = 'jiffy-session-coordinator'

/**
 * Evento disparado quando o refresh do token da empresa falha.
 * Ouvido pelo AuthGuard: se o hub ainda for válido → hub root; senão → `/login`.
 */
export const JIFFY_SESSION_EXPIRED_EVENT = 'jiffy:session-expired'

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
 * Slug da empresa na URL (ex: `nexsyn-ab12cd34` em `/gestao/nexsyn-ab12cd34/dashboard`).
 * Gravado ao consumir sessão; lido por `useEmpresaUrlSync` para manter o path.
 */
export const SESSION_STORAGE_EMPRESA_SLUG = 'jiffy:empresa-slug'

/**
 * UUID completo da empresa desta aba.
 * Fonte de verdade canônica para anti-mix (URL/token/refresh).
 */
export const SESSION_STORAGE_EMPRESA_ID = 'jiffy:empresa-id'
