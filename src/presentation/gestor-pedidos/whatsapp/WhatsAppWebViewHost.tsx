'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { stripGestaoEmpresaSlugFromPath } from '@/src/shared/utils/gestaoRoutes'
import { estaNoAppJiffyFlow, isRotaWhatsAppFlow } from '../kiosk/isKioskGestorPedidos'
import {
  boundsDoSlotWhatsApp,
  deveReposicionarWhatsAppNativo,
  podeControlarWhatsAppWebView,
  whatsappHide,
  whatsappShow,
} from './tauriWhatsAppBridge'
import { onWhatsAppWebViewSuspenso, whatsappWebViewEstaSuspenso } from './whatsappUiState'

export const WHATSAPP_SLOT_ID = 'jiffy-whatsapp-slot'

const RETRY_MS = 120
const RETRY_MAX = 80

/**
 * Fica montado no shell do kiosk. O WebView nativo só esconde/mostra —
 * não recarrega ao ir a Pedidos e voltar.
 */
export function WhatsAppWebViewHost() {
  const pathname = usePathname()
  const visivelRef = useRef(false)
  const aMostrarRef = useRef(false)

  useEffect(() => {
    if (!estaNoAppJiffyFlow()) return

    const naRota = isRotaWhatsAppFlow(stripGestaoEmpresaSlugFromPath(pathname ?? ''))
    let cancelado = false
    let tentativas = 0
    let timer = 0

    const aplicar = () => {
      if (cancelado) return
      if (!deveReposicionarWhatsAppNativo(document.visibilityState)) {
        return
      }
      if (!naRota || whatsappWebViewEstaSuspenso()) {
        if (visivelRef.current) {
          visivelRef.current = false
          void whatsappHide()
        }
        return
      }
      if (!podeControlarWhatsAppWebView()) {
        if (tentativas < RETRY_MAX) {
          tentativas += 1
          timer = window.setTimeout(aplicar, RETRY_MS)
        }
        return
      }
      const bounds = boundsDoSlotWhatsApp(WHATSAPP_SLOT_ID)
      if (!bounds) {
        if (tentativas < RETRY_MAX) {
          tentativas += 1
          timer = window.setTimeout(aplicar, RETRY_MS)
        }
        return
      }
      if (aMostrarRef.current) return
      aMostrarRef.current = true
      visivelRef.current = true
      void whatsappShow(bounds)
        .then(() => {
          const slot = document.getElementById(WHATSAPP_SLOT_ID)
          if (slot) delete slot.dataset.erro
          window.dispatchEvent(new CustomEvent('jiffy-whatsapp-ok'))
        })
        .catch(err => {
          visivelRef.current = false
          const msg = err instanceof Error ? err.message : String(err)
          const slot = document.getElementById(WHATSAPP_SLOT_ID)
          if (slot) slot.dataset.erro = msg
          window.dispatchEvent(new CustomEvent('jiffy-whatsapp-erro', { detail: msg }))
          console.error('WhatsApp WebView', err)
          if (!cancelado && tentativas < RETRY_MAX) {
            tentativas += 1
            timer = window.setTimeout(aplicar, 400)
          }
        })
        .finally(() => {
          aMostrarRef.current = false
        })
    }

    aplicar()
    window.addEventListener('resize', aplicar)
    document.addEventListener('visibilitychange', aplicar)
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => aplicar())
        : null
    const slot = document.getElementById(WHATSAPP_SLOT_ID)
    if (slot && ro) ro.observe(slot)
    const off = onWhatsAppWebViewSuspenso(aplicar)
    return () => {
      cancelado = true
      window.clearTimeout(timer)
      window.removeEventListener('resize', aplicar)
      document.removeEventListener('visibilitychange', aplicar)
      ro?.disconnect()
      off()
    }
  }, [pathname])

  useEffect(() => {
    return () => {
      if (visivelRef.current) {
        void whatsappHide()
      }
    }
  }, [])

  return null
}
