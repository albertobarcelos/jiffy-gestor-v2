'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  boundsDoSlotWhatsApp,
  deveReposicionarWhatsAppNativo,
  podeControlarWhatsAppWebView,
  whatsappClearSession,
  whatsappShow,
} from './tauriWhatsAppBridge'
import { JiffyCustomerPanel } from './JiffyCustomerPanel'
import { JiffyWhatsAppToolbar } from './JiffyWhatsAppToolbar'
import { WHATSAPP_SLOT_ID } from './WhatsAppWebViewHost'

/**
 * Painel Jiffy à direita. O WhatsApp Web é um WebView nativo do Tauri (não iframe).
 * A árvore do primeiro paint é igual no servidor e no cliente (sem `window` no render).
 */
export function EscolherWhatsAppFlowPage() {
  const [confirmarLimpar, setConfirmarLimpar] = useState(false)
  const [erroNative, setErroNative] = useState<string | null>(null)
  const [nativoOk, setNativoOk] = useState(false)
  const [noFlow, setNoFlow] = useState<boolean | null>(null)

  useEffect(() => {
    setNoFlow(podeControlarWhatsAppWebView())
  }, [])

  useEffect(() => {
    const onOk = () => {
      setErroNative(null)
      setNativoOk(true)
    }
    const onErro = (ev: Event) => {
      const detalhe = (ev as CustomEvent<string>).detail
      setErroNative(typeof detalhe === 'string' ? detalhe : 'Não foi possível abrir o WhatsApp Web')
    }
    window.addEventListener('jiffy-whatsapp-ok', onOk)
    window.addEventListener('jiffy-whatsapp-erro', onErro)
    return () => {
      window.removeEventListener('jiffy-whatsapp-ok', onOk)
      window.removeEventListener('jiffy-whatsapp-erro', onErro)
    }
  }, [])

  useEffect(() => {
    if (noFlow !== true) return
    let cancelado = false
    let tentativas = 0
    const tentar = () => {
      if (cancelado) return
      if (!deveReposicionarWhatsAppNativo(document.visibilityState)) return
      const bounds = boundsDoSlotWhatsApp(WHATSAPP_SLOT_ID)
      if (!bounds) {
        if (tentativas < 40) {
          tentativas += 1
          window.setTimeout(tentar, 150)
        }
        return
      }
      void whatsappShow(bounds).catch(err => {
        if (cancelado) return
        setErroNative(err instanceof Error ? err.message : String(err))
      })
    }
    tentar()
    return () => {
      cancelado = true
    }
  }, [noFlow])

  const limpar = useCallback(async () => {
    setConfirmarLimpar(false)
    try {
      await whatsappClearSession()
      window.dispatchEvent(new Event('resize'))
    } catch {
      /* o host recria na próxima visita */
    }
  }, [])

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col bg-primary-bg">
      <JiffyWhatsAppToolbar aba="whatsapp" />
      <div className="flex min-h-0 flex-1">
        <div
          id={WHATSAPP_SLOT_ID}
          className="relative min-h-0 min-w-0 flex-1 bg-[#111b21]"
        >
          {noFlow === false ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/80">
              O WhatsApp Web abre no Jiffy Flow (aplicativo Windows), não no browser.
            </div>
          ) : noFlow === true && (erroNative || !nativoOk) ? (
            <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-white/70">
              {erroNative ?? 'A abrir o WhatsApp Web…'}
            </p>
          ) : null}
        </div>
        <JiffyCustomerPanel onPedirLimparSessao={() => setConfirmarLimpar(true)} />
      </div>

      {confirmarLimpar ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 px-4">
          <div className="max-w-sm rounded-xl bg-white p-4 shadow-lg">
            <p className="text-sm text-primary-text">
              Isso desconectará o WhatsApp deste computador e será necessário escanear o QR Code
              novamente.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-sm hover:bg-primary-bg"
                onClick={() => setConfirmarLimpar(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="rounded-lg bg-primary px-3 py-1.5 text-sm text-white"
                onClick={() => void limpar()}
              >
                Desconectar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
