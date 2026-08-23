/** Quadro no browser. Windows / kiosk: o mesmo path, sem TopNav (Tauri ou `?gestor`). */
export const PEDIDOS_PATH = '/pedidos'

/** Página do menu: tenta o protocolo e oferece o instalador. */
export const PEDIDOS_ABRIR_WINDOWS_PATH = '/pedidos/abrir-windows'

/** Protocolo que o instalador Windows deve registar. */
export const PEDIDOS_WINDOWS_PROTOCOLO = 'gestor-pedidos://open'

/** `/pedidos?gestor` esconde o TopNav (dev / Windows). */
export const QUERY_GESTOR = 'gestor'

/** Override local (DevTools). Não é persistência de negócio. */
export const STORAGE_SOMENTE_PORTAL = 'jiffy.superficie.somente'

export function urlInstaladorPedidosWindows(): string | null {
  const url = process.env.NEXT_PUBLIC_PEDIDOS_WINDOWS_SETUP_URL?.trim()
  return url || null
}
