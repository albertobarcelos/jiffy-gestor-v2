import { showToast } from '@/src/shared/utils/toast'
import {
  logFalhaMapaGoogle,
  marcarGeocodeServicoIndisponivel,
  MENSAGEM_MAPA_INDISPONIVEL_SUPORTE,
  TOAST_ID_MAPA_INDISPONIVEL,
} from '@/src/shared/utils/googleMapsFalha'

const CLASSE_MAPA_INDISPONIVEL = 'jiffy-mapa-google-indisponivel'

function ocultarOverlaysErroGoogleMaps(): void {
  if (typeof document === 'undefined') return
  document.body.classList.add(CLASSE_MAPA_INDISPONIVEL)
  document.querySelectorAll('.dismissButton').forEach(botao => {
    const painel = botao.parentElement
    if (painel instanceof HTMLElement) painel.style.display = 'none'
  })
}

let avisoClienteFeito = false

export function avisarMapaIndisponivelCliente(contexto: string, detalhe?: unknown): void {
  logFalhaMapaGoogle(contexto, detalhe)
  if (avisoClienteFeito) return
  avisoClienteFeito = true
  showToast.error(MENSAGEM_MAPA_INDISPONIVEL_SUPORTE, {
    id: TOAST_ID_MAPA_INDISPONIVEL,
    duration: 8000,
  })
}

let authFalhou = false
const authListeners = new Set<() => void>()

export function mapaGoogleAuthFalhou(): boolean {
  return authFalhou
}

export function onMapaGoogleAuthFailure(listener: () => void): () => void {
  authListeners.add(listener)
  return () => {
    authListeners.delete(listener)
  }
}

export function marcarMapaGoogleAuthFalhou(contexto: string, detalhe?: unknown): void {
  marcarGeocodeServicoIndisponivel()
  ocultarOverlaysErroGoogleMaps()
  if (typeof window !== 'undefined') {
    window.setTimeout(ocultarOverlaysErroGoogleMaps, 0)
    window.setTimeout(ocultarOverlaysErroGoogleMaps, 250)
  }
  if (authFalhou) {
    logFalhaMapaGoogle(contexto, detalhe)
    return
  }
  authFalhou = true
  avisarMapaIndisponivelCliente(contexto, detalhe)
  authListeners.forEach(listener => listener())
}

export function registrarCallbackAuthGoogleMaps(): void {
  if (typeof window === 'undefined') return
  const atual = window.gm_authFailure
  window.gm_authFailure = () => {
    atual?.()
    marcarMapaGoogleAuthFalhou('gm_authFailure')
  }
}

declare global {
  interface Window {
    gm_authFailure?: () => void
  }
}
