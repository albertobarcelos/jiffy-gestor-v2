import { estaNoAppJiffyFlow } from '../kiosk/isKioskGestorPedidos'

export type WhatsAppBounds = {
  x: number
  y: number
  width: number
  height: number
}

export type WhatsAppStatus = {
  visible: boolean
  loaded: boolean
}

export type WhatsAppChatHint = {
  telefone: string | null
  titulo: string | null
}

const INVOKE_TIMEOUT_MS = 12_000

type InvokeFn = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>

function resolverInvoke(): InvokeFn | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    __TAURI__?: { core?: { invoke?: InvokeFn } }
    __TAURI_INTERNALS__?: { invoke?: InvokeFn }
  }
  if (typeof w.__TAURI__?.core?.invoke === 'function') {
    return (cmd, args) => w.__TAURI__!.core!.invoke!(cmd, args)
  }
  if (typeof w.__TAURI_INTERNALS__?.invoke === 'function') {
    return (cmd, args) => Promise.resolve(w.__TAURI_INTERNALS__!.invoke!(cmd, args))
  }
  return null
}

export function podeControlarWhatsAppWebView(): boolean {
  return estaNoAppJiffyFlow() && resolverInvoke() !== null
}

function comTimeout<T>(p: Promise<T>, ms: number, cmd: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => {
      reject(new Error(`WhatsApp Web não respondeu (${cmd})`))
    }, ms)
    p.then(
      v => {
        window.clearTimeout(t)
        resolve(v)
      },
      e => {
        window.clearTimeout(t)
        reject(e instanceof Error ? e : new Error(String(e)))
      }
    )
  })
}

let cadeia: Promise<unknown> = Promise.resolve()

function naFila<T>(fn: () => Promise<T>): Promise<T> {
  const exec = cadeia.then(fn, fn)
  cadeia = exec.then(
    () => undefined,
    () => undefined
  )
  return exec
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const api = resolverInvoke()
  if (!api) {
    throw new Error('WhatsApp Web só no Jiffy Flow')
  }
  return comTimeout(api(cmd, args) as Promise<T>, INVOKE_TIMEOUT_MS, cmd)
}

export async function whatsappShow(bounds: WhatsAppBounds): Promise<void> {
  await naFila(() => invoke('whatsapp_show', { bounds }))
}

export async function whatsappHide(): Promise<void> {
  await naFila(() => invoke('whatsapp_hide'))
}

export async function whatsappReload(): Promise<void> {
  await naFila(() => invoke('whatsapp_reload'))
}

export async function whatsappClearSession(): Promise<void> {
  await naFila(() => invoke('whatsapp_clear_session'))
}

export async function whatsappStatus(): Promise<WhatsAppStatus> {
  return invoke<WhatsAppStatus>('whatsapp_status')
}

export async function whatsappChatHint(): Promise<WhatsAppChatHint> {
  const raw = await invoke<WhatsAppChatHint>('whatsapp_chat_hint')
  return {
    telefone: raw?.telefone ?? null,
    titulo: raw?.titulo ?? null,
  }
}

export async function whatsappInserirTexto(texto: string): Promise<boolean> {
  return naFila(() => invoke<boolean>('whatsapp_inserir_texto', { texto }))
}

export function boundsDoSlotWhatsApp(slotId: string): WhatsAppBounds | null {
  if (typeof document === 'undefined') return null
  const el = document.getElementById(slotId)
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width < 80 || r.height < 80) return null
  return { x: r.left, y: r.top, width: r.width, height: r.height }
}

/** Minimizar dispara resize no WebView; um `show` nativo aí restaura/cobre a bolha. */
export function deveReposicionarWhatsAppNativo(
  visibilityState: DocumentVisibilityState | string | undefined
): boolean {
  return visibilityState === 'visible'
}
