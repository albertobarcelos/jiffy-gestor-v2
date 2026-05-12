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
 * Logout só da empresa: limpa cache + tenant state, depois fecha a aba.
 *
 * Fluxo:
 *  1. Marca `TENANT_LOGOUT_SELF` → AuthGuard não redireciona enquanto o flag existir.
 *  2. Limpa React Query e chama logoutTenant (sessionStorage + Zustand).
 *  3. Pergunta ao hub (BroadcastChannel) se existe.
 *  4. Hub vivo → tenta `window.close()`.
 *     - Se fechar → fim.
 *     - Se não fechar (aba aberta manualmente) → mantém flag, AuthGuard exibe tela
 *       de "sessão encerrada" (evita duplicar guia Meus Apps).
 *  5. Sem hub → navega `/login`.
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
    hubAlive = await new Promise<boolean>(resolve => {
      const timer = window.setTimeout(() => resolve(false), 400)
      bc.onmessage = (ev: MessageEvent<{ type?: string }>) => {
        if (ev.data?.type === 'hub-pong') {
          window.clearTimeout(timer)
          resolve(true)
        }
      }
      bc.postMessage({ type: 'hub-ping', ts: Date.now() })
    })
    bc.close()
  } catch {
    /* BroadcastChannel indisponível */
  }

  if (!hubAlive) {
    cleanupFlag()
    window.location.assign('/login')
    return
  }

  try {
    window.close()
  } catch {
    /* noop */
  }

  await new Promise<void>(r => window.setTimeout(r, 300))

  if (typeof document === 'undefined' || document.visibilityState !== 'visible') {
    return
  }

  // window.close() falhou (aba aberta manualmente, não por window.open).
  // Manter flag ativo → AuthGuard exibe tela de "sessão encerrada"
  // em vez de redirecionar para /meus-apps (evita duplicar guia do hub).
}

function cleanupFlag(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_TENANT_LOGOUT_SELF)
  } catch {
    /* noop */
  }
}
