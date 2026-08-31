/**
 * Casco `/pedidos` (browser + Windows).
 *
 * quadro/     — adapter do VendasKanban
 * kiosk/      — Tauri ou `?gestor`
 * sessao/     — login, hub, paths
 * windows/    — protocolo + instalador
 * superficie/ — gate do operador exclusivo
 *
 * Claim JWT do módulo continua `portal-pedidos` (contrato do backend).
 */
export const PEDIDOS_PATH = '/pedidos'

/** Inbox WhatsApp Web no casco Flow (WebView Tauri). */
export const PEDIDOS_WHATSAPP_PATH = '/pedidos/whatsapp'

/** Largura do painel Jiffy ao lado do WhatsApp (px lógicos). */
export const WHATSAPP_PAINEL_LARGURA_PX = 320

/** Busca do quadro ao voltar de «Pedidos do cliente». */
export const STORAGE_KANBAN_BUSCA_FLOW = 'jiffy.flow.kanban.busca'

/** Período do quadro ao voltar de «Pedidos do cliente» (`todos`). */
export const STORAGE_KANBAN_PERIODO_FLOW = 'jiffy.flow.kanban.periodo'

/** Página do menu: tenta o protocolo e oferece o instalador. */
export const PEDIDOS_ABRIR_WINDOWS_PATH = '/pedidos/abrir-windows'

/** Protocolo que o Jiffy Flow regista. Não muda com o nome do produto. */
export const PEDIDOS_WINDOWS_PROTOCOLO = 'gestor-pedidos://open'

/** `/pedidos?gestor` esconde o TopNav (dev no browser). No .exe a marca é o User-Agent. */
export const QUERY_GESTOR = 'gestor'

/**
 * Marca do Jiffy Flow no User-Agent do WebView. O Chrome da loja nunca tem isto.
 * Espelhado em `apps/jiffy-flow` (`JiffyFlow/` na janela principal).
 */
export const TOKEN_USER_AGENT_JIFFY_FLOW = 'JiffyFlow/'

/** Override local (DevTools). Não é persistência de negócio. */
export const STORAGE_SOMENTE_PEDIDOS = 'jiffy.superficie.somente'

export {
  JIFFY_FLOW_R2_PATHS,
  urlInstaladorJiffyFlow as urlInstaladorPedidosWindows,
} from '@/src/infrastructure/windows/jiffyFlowR2'
