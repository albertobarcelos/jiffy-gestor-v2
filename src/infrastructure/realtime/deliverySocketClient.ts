import { io, type Socket } from 'socket.io-client'

export type DeliverySocketAuth = {
  token: string
  estacaoId?: string | null
}

export type DeliverySocketHandlers = {
  onConnect?: () => void
  onDisconnect?: (reason: string) => void
  onConnectError?: (error: Error) => void
}

/**
 * No browser: mesma origem do Gestor (Next rewrite /ws -> API).
 * Fora do browser: URL direta da API.
 */
function resolveSocketBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  const raw = (process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL || '').trim()
  if (raw) return raw.replace(/\/$/, '')
  return 'http://localhost:3000'
}

/**
 * Cliente Socket.IO do canal delivery (path: /ws).
 * Sem regra de negocio - so transporte e auth de handshake.
 */
export function connectDeliverySocket(
  auth: DeliverySocketAuth,
  handlers: DeliverySocketHandlers = {}
): Socket {
  const token = auth.token.trim()
  const estacaoId = auth.estacaoId?.trim() || undefined

  const socket = io(resolveSocketBaseUrl(), {
    path: '/ws',
    auth: {
      token,
      ...(estacaoId ? { estacaoId } : {}),
    },
    withCredentials: true,
    // Polling via rewrite do Next (upgrade wss no proxy da homolog ainda responde 400).
    transports: ['polling'],
    upgrade: false,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 15000,
  })

  if (handlers.onConnect) socket.on('connect', handlers.onConnect)
  if (handlers.onDisconnect) socket.on('disconnect', handlers.onDisconnect)
  if (handlers.onConnectError) {
    socket.on('connect_error', err => {
      handlers.onConnectError?.(err instanceof Error ? err : new Error(String(err)))
    })
  }

  return socket
}

export function disconnectDeliverySocket(socket: Socket | null | undefined): void {
  if (!socket) return
  socket.removeAllListeners()
  socket.disconnect()
}
