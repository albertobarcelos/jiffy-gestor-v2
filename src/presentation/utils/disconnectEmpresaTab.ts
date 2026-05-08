import type { QueryClient } from '@tanstack/react-query'
import {
  JIFFY_SESSION_BROADCAST_CHANNEL,
  SESSION_STORAGE_TENANT_LOGOUT_SELF,
} from '@/src/shared/constants/sessionCoordinator'

type DisconnectOpts = {
  queryClient: QueryClient
  logoutTenant: () => Promise<void>
}

/**
 * Logout só da empresa: limpa cache, remove tenant; pergunta ao hub (BroadcastChannel) se existe.
 * Sem hub → navegações diretas para `/login` (evita `close()` antes e perder o fallback).
 * Com hub → tenta fechar a guia; se ainda estiver visível, fallback `/meus-apps`.
 */
export async function disconnectEmpresaTab({ queryClient, logoutTenant }: DisconnectOpts): Promise<void> {
  try {
    sessionStorage.setItem(SESSION_STORAGE_TENANT_LOGOUT_SELF, '1')
  } catch {
    /* noop */
  }

  try {
    queryClient.clear()
    await logoutTenant()
  } catch (e) {
    console.error('disconnectEmpresaTab:', e)
  }

  let hubAlive = false
  try {
    const bc = new BroadcastChannel(JIFFY_SESSION_BROADCAST_CHANNEL)
    const onPong = (ev: MessageEvent<{ type?: string }>) => {
      if (ev.data?.type === 'hub-pong') {
        hubAlive = true
      }
    }
    bc.addEventListener('message', onPong)
    bc.postMessage({ type: 'hub-ping', ts: Date.now() })
    await new Promise<void>(resolve => {
      window.setTimeout(resolve, 400)
    })
    bc.removeEventListener('message', onPong)
    bc.close()
  } catch {
    /* BroadcastChannel indisponível */
  }

  // Sem guia Meus Apps: não tentar fechar antes — se close() funcionar, o fallback nunca roda e o utilizador fica sem login.
  if (!hubAlive) {
    window.location.assign('/login')
    return
  }

  try {
    window.close()
  } catch {
    /* noop */
  }

  window.setTimeout(() => {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_TENANT_LOGOUT_SELF)
    } catch {
      /* noop */
    }
    if (typeof document === 'undefined' || document.visibilityState !== 'visible') {
      return
    }
    window.location.assign('/meus-apps')
  }, 250)
}
