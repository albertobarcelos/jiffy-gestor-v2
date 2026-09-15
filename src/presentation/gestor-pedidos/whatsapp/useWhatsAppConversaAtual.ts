'use client'

import { useEffect, useRef, useState } from 'react'
import { idConversaWhatsApp } from '@/src/shared/utils/nomeClienteMatch'
import { podeControlarWhatsAppWebView, whatsappChatHint } from './tauriWhatsAppBridge'

export type ConversaWhatsAppAtual = {
  telefone: string | null
  titulo: string | null
}

export function useWhatsAppConversaAtual(): ConversaWhatsAppAtual {
  const [hint, setHint] = useState<ConversaWhatsAppAtual>({ telefone: null, titulo: null })
  const telefonePorConversaRef = useRef<Record<string, string>>({})

  useEffect(() => {
    if (!podeControlarWhatsAppWebView()) return
    let cancelado = false
    const tick = () => {
      void whatsappChatHint()
        .then(h => {
          if (cancelado) return
          const telLido = (h.telefone || '').trim() || null
          const titulo = (h.titulo || '').trim() || null
          const idNome = idConversaWhatsApp(null, titulo)
          if (telLido && idNome) {
            telefonePorConversaRef.current[idNome] = telLido
          }
          const cached =
            telLido ||
            (idNome ? telefonePorConversaRef.current[idNome] : undefined) ||
            null
          setHint({ telefone: cached, titulo })
        })
        .catch(() => {
          /* webview ainda a nascer */
        })
    }
    tick()
    const id = window.setInterval(tick, 800)
    return () => {
      cancelado = true
      window.clearInterval(id)
    }
  }, [])

  return hint
}
