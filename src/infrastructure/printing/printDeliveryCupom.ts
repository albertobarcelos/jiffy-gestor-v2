import { erroImpressao, logImpressao, warnImpressao } from '@/src/shared/utils/logImpressaoDelivery'
import { loadQzTray, ensureQzWebsocketConnected } from '@/src/infrastructure/printing/qzTrayClient'

export interface PrintDeliveryCupomInput {
  html: string
  /** Nome exato da impressora no Windows (lista do QZ Tray). Se vazio, só fallback. */
  printerName: string | null
  copies?: number
  jobName?: string
}

export type PrintDeliveryCupomResult = {
  ok: boolean
  metodo: 'qz' | 'browser'
  mensagem?: string
}

function fallbackImprimirHtmlNoNavegador(html: string): PrintDeliveryCupomResult {
  try {
    const janela = window.open('', '_blank', 'noopener,noreferrer,width=420,height=720')
    if (!janela) {
      return {
        ok: false,
        metodo: 'browser',
        mensagem:
          'Não foi possível abrir a janela de impressão. Permita pop-ups ou use o QZ Tray.',
      }
    }
    janela.document.open()
    janela.document.write(html)
    janela.document.close()
    janela.focus()
    const imprimir = () => {
      try {
        janela.print()
      } finally {
        setTimeout(() => janela.close(), 500)
      }
    }
    setTimeout(imprimir, 250)
    return { ok: true, metodo: 'browser' }
  } catch (e) {
    return {
      ok: false,
      metodo: 'browser',
      mensagem: e instanceof Error ? e.message : 'Falha na impressão pelo navegador',
    }
  }
}

/**
 * Envia HTML para impressão via QZ Tray (pixel/html). Sem impressora ou sem QZ → `window.print`.
 * Em HTTPS em produção o QZ costuma exigir certificado/assinatura — configurar no deployment.
 */
export async function printDeliveryCupom(input: PrintDeliveryCupomInput): Promise<PrintDeliveryCupomResult> {
  const copies = Math.min(20, Math.max(1, input.copies ?? 1))
  const nomeImpressora = input.printerName?.trim()

  if (typeof window === 'undefined') {
    return { ok: false, metodo: 'browser', mensagem: 'Impressão só no navegador.' }
  }

  if (!nomeImpressora) {
    logImpressao('printDeliveryCupom.fallback_browser', {
      motivo: 'printerName_vazio',
      jobName: input.jobName,
      copies,
      htmlChars: input.html.length,
    })
    return fallbackImprimirHtmlNoNavegador(input.html)
  }

  try {
    logImpressao('printDeliveryCupom.qz_inicio', {
      impressoraWindows: nomeImpressora.slice(0, 80),
      copies,
      jobName: input.jobName ?? 'Jiffy Delivery',
      htmlChars: input.html.length,
    })
    const qz = await loadQzTray()
    await ensureQzWebsocketConnected(qz)
    logImpressao('printDeliveryCupom.qz_modulo', { wsJaAtivo: qz.websocket.isActive() })
    const config = qz.configs.create(nomeImpressora, {
      jobName: input.jobName ?? 'Jiffy Delivery',
    })
    const payload = [
      {
        type: 'pixel' as const,
        format: 'html' as const,
        flavor: 'plain' as const,
        data: input.html,
      },
    ]
    for (let i = 0; i < copies; i++) {
      logImpressao('printDeliveryCupom.qz_loop', { copiaDe: copies, indice: i + 1 })
      await qz.print(config, payload)
    }
    logImpressao('printDeliveryCupom.qz_sucesso', { copies, impressora: nomeImpressora.slice(0, 80) })
    return { ok: true, metodo: 'qz' }
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : 'QZ Tray não respondeu (instale/inicie o aplicativo no Windows).'
    erroImpressao('printDeliveryCupom.qz_excecao', {
      mensagem: msg,
      stack: e instanceof Error ? e.stack?.slice(0, 600) : null,
      impressora: nomeImpressora.slice(0, 80),
    })
    warnImpressao('printDeliveryCupom.tentativa_fallback_browser', { aposErroQz: msg.slice(0, 200) })
    const fb = fallbackImprimirHtmlNoNavegador(input.html)
    logImpressao('printDeliveryCupom.fallback_resultado', { okFallback: fb.ok, mensagemFallback: fb.mensagem })
    return {
      ok: fb.ok,
      metodo: 'browser',
      mensagem: fb.ok ? msg : fb.mensagem ?? msg,
    }
  }
}
