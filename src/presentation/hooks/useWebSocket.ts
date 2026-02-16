import { useEffect, useState, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'

interface WebSocketMessage {
  type: 'auth' | 'status_update' | 'ping' | 'pong' | 'error'
  status?: string
  empresaId?: string
  vendaId?: string
  timestamp?: string
  message?: string
}

interface UseWebSocketOptions {
  enabled?: boolean
  onStatusUpdate?: (vendaId: string, status: string) => void
}

/**
 * Hook para gerenciar conexão WebSocket e receber atualizações de status fiscal
 * 
 * @param options - Opções de configuração
 * @returns Estado da conexão e funções auxiliares
 */
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { enabled = true, onStatusUpdate } = options
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  
  const [isConnected, setIsConnected] = useState(false)
  const [usePolling, setUsePolling] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5

  // Obter empresaId do token
  const getEmpresaId = useCallback((): string | null => {
    const token = auth?.getAccessToken()
    if (!token) return null

    try {
      const parts = token.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]))
        return payload.empresaId || null
      }
    } catch (error) {
      console.error('Erro ao decodificar token:', error)
    }
    return null
  }, [auth])

  // Conectar ao WebSocket
  const connect = useCallback(() => {
    if (!enabled) return

    const empresaId = getEmpresaId()
    if (!empresaId) {
      console.warn('EmpresaId não encontrado, usando polling como fallback')
      setUsePolling(true)
      return
    }

    // Determinar URL do WebSocket
    // WebSocket precisa conectar diretamente ao backend, não através do proxy do Next.js
    const backendUrl = process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL || 'http://localhost:3000'
    
    // Converter http:// para ws:// ou https:// para wss://
    const wsUrl = backendUrl
      .replace(/^http:/, 'ws:')
      .replace(/^https:/, 'wss:') + '/api/ws/fiscal'

    try {
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('WebSocket conectado')
        setIsConnected(true)
        setUsePolling(false)
        reconnectAttemptsRef.current = 0

        // Autenticar
        const token = auth?.getAccessToken()
        if (token) {
          ws.send(JSON.stringify({
            type: 'auth',
            empresaId,
            token: `Bearer ${token}`
          }))
        }
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)

          if (message.type === 'auth') {
            if (message.status === 'authenticated') {
              console.log('WebSocket autenticado com sucesso')
            } else {
              console.error('Falha na autenticação WebSocket:', message.message)
              setUsePolling(true)
            }
          } else if (message.type === 'status_update') {
            if (message.vendaId && message.status) {
              // Invalidar cache do React Query
              queryClient.invalidateQueries({ 
                queryKey: ['vendas-unificadas'] 
              })
              queryClient.invalidateQueries({ 
                queryKey: ['vendas'] 
              })
              queryClient.invalidateQueries({ 
                queryKey: ['venda', message.vendaId] 
              })
              queryClient.invalidateQueries({ 
                queryKey: ['venda-gestor', message.vendaId] 
              })

              // Chamar callback se fornecido
              if (onStatusUpdate) {
                onStatusUpdate(message.vendaId, message.status)
              }

              // Toast opcional (pode ser removido se muito verboso)
              // showToast.info(`Status da venda atualizado: ${message.status}`)
            }
          } else if (message.type === 'pong') {
            // Resposta ao ping - conexão está viva
          } else if (message.type === 'ping') {
            // Responder ping com pong
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'pong' }))
            }
          } else if (message.type === 'error') {
            console.error('Erro do WebSocket:', message.message)
          }
        } catch (error) {
          console.error('Erro ao processar mensagem WebSocket:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('Erro na conexão WebSocket:', error)
        setIsConnected(false)
        setUsePolling(true)
      }

      ws.onclose = (event) => {
        console.log('WebSocket desconectado', { code: event.code, reason: event.reason })
        setIsConnected(false)

        // Tentar reconectar se não foi fechado intencionalmente
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000) // Backoff exponencial, max 30s
          
          console.log(`Tentando reconectar em ${delay}ms (tentativa ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, delay)
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.warn('Máximo de tentativas de reconexão atingido, usando polling')
          setUsePolling(true)
        }
      }

      wsRef.current = ws
    } catch (error) {
      console.error('Erro ao criar conexão WebSocket:', error)
      setUsePolling(true)
    }
  }, [enabled, getEmpresaId, auth, queryClient, onStatusUpdate])

  // Polling como fallback
  useEffect(() => {
    if (!usePolling || !enabled) return

    const interval = setInterval(() => {
      // Refetch dados a cada 3 segundos
      queryClient.invalidateQueries({ 
        queryKey: ['vendas-unificadas'] 
      })
      queryClient.invalidateQueries({ 
        queryKey: ['vendas'] 
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [usePolling, enabled, queryClient])

  // Conectar quando montar ou quando enabled mudar
  useEffect(() => {
    if (enabled) {
      connect()
    }

    return () => {
      // Limpar ao desmontar
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted')
        wsRef.current = null
      }
    }
  }, [enabled, connect])

  return {
    isConnected,
    usePolling,
    reconnect: connect
  }
}
