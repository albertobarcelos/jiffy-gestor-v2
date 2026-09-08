'use client'

import { useEffect, useState } from 'react'
import { podeControlarWhatsAppWebView, whatsappChatHint } from './tauriWhatsAppBridge'

export type ConversaWhatsAppAtual = {
  telefone: string | null
  titulo: string | null
}

export function useWhatsAppConversaAtual(): ConversaWhatsAppAtual {
  const [hint, setHint] = useState<ConversaWhatsAppAtual>({ telefone: null, titulo: null })

  useEffect(() => {
    if (!podeControlarWhatsAppWebView()) return
    let cancelado = false
    const tick = () => {
      void whatsappChatHint()
        .then(h => {
          if (!cancelado) setHint({ telefone: h.telefone, titulo: h.titulo })
        })
        .catch(() => {
          /* webview ainda a nascer */
        })
    }
    tick()
    const id = window.setInterval(tick, 1500)
    return () => {
      cancelado = true
      window.clearInterval(id)
    }
  }, [])

  return hint
}
