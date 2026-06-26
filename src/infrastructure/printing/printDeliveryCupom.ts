import { erroImpressao, logImpressao } from '@/src/shared/utils/logImpressaoDelivery'
import {
  loadQzTray,
  ensureQzWebsocketConnected,
  parseTcpPrinterRef,
  printRawTcpQz,
  isTcpPrinterRef,
} from '@/src/infrastructure/printing/qzTrayClient'
import {
  destinoImpressoraResumo,
  mensagemFalhaQzTray,
  isImpressoraVirtualPdf,
  mensagemImpressoraVirtualPdf,
} from '@/src/infrastructure/printing/resolvePrinterDestinationForTicket'

export interface PrintDeliveryCupomInput {
  html: string
  /**
   * Nome da impressora Windows (lista QZ Tray) OU referência TCP direta `tcp://IP:PORTA`.
   */
  printerName: string | null
  copies?: number
  jobName?: string
}

export type PrintDeliveryCupomResult = {
  ok: boolean
  metodo: 'qz' | 'browser'
  mensagem?: string
}

function extrairMensagemErro(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'object' && e !== null && 'message' in e) {
    return String((e as { message: unknown }).message)
  }
  return 'QZ Tray não respondeu (instale/inicie o aplicativo no Windows).'
}

/**
 * Envia cupom para impressão via QZ Tray (Windows ou TCP/IP).
 * Não abre diálogo do navegador — falhas retornam mensagem explícita.
 */
export async function printDeliveryCupom(input: PrintDeliveryCupomInput): Promise<PrintDeliveryCupomResult> {
  const copies = Math.min(20, Math.max(1, input.copies ?? 1))
  const nomeImpressora = input.printerName?.trim()

  if (typeof window === 'undefined') {
    return { ok: false, metodo: 'qz', mensagem: 'Impressão só no navegador.' }
  }

  if (!nomeImpressora) {
    logImpressao('printDeliveryCupom.sem_destino', {
      jobName: input.jobName,
      copies,
      htmlChars: input.html.length,
    })
    return {
      ok: false,
      metodo: 'qz',
      mensagem:
        'Nenhuma impressora configurada. Em Configurações → Impressoras, vincule a impressora lógica ao IP (botão IP) ou à impressora Windows.',
    }
  }

  const tcpRef = parseTcpPrinterRef(nomeImpressora)

  if (isTcpPrinterRef(nomeImpressora) && !tcpRef) {
    return {
      ok: false,
      metodo: 'qz',
      mensagem:
        'Endereço IP inválido. Use tcp://192.168.x.x:9100 ou apenas o IP (porta 9100 padrão).',
    }
  }

  if (!tcpRef && isImpressoraVirtualPdf(nomeImpressora)) {
    return {
      ok: false,
      metodo: 'qz',
      mensagem: mensagemImpressoraVirtualPdf(nomeImpressora),
    }
  }

  try {
    const qz = await loadQzTray()

    if (tcpRef) {
      logImpressao('printDeliveryCupom.qz_tcp_inicio', {
        host: tcpRef.host,
        port: tcpRef.port,
        copies,
        jobName: input.jobName ?? 'Jiffy',
        htmlChars: input.html.length,
      })
      await printRawTcpQz(qz, tcpRef.host, tcpRef.port, input.html, copies, input.jobName ?? 'Jiffy')
      logImpressao('printDeliveryCupom.qz_tcp_sucesso', { copies, host: tcpRef.host, port: tcpRef.port })
      return { ok: true, metodo: 'qz' }
    }

    logImpressao('printDeliveryCupom.qz_inicio', {
      impressoraWindows: nomeImpressora.slice(0, 80),
      copies,
      jobName: input.jobName ?? 'Jiffy Delivery',
      htmlChars: input.html.length,
    })
    await ensureQzWebsocketConnected(qz)
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
      await qz.print(config, payload)
    }
    logImpressao('printDeliveryCupom.qz_sucesso', {
      copies,
      impressora: nomeImpressora.slice(0, 80),
    })
    return { ok: true, metodo: 'qz' }
  } catch (e) {
    const msg = extrairMensagemErro(e)
    erroImpressao(
      'printDeliveryCupom.qz_excecao',
      {
        mensagem: msg,
        stack: e instanceof Error ? e.stack?.slice(0, 600) : null,
        impressora: destinoImpressoraResumo(nomeImpressora),
        tcpMode: tcpRef !== null,
      },
      e
    )
    return {
      ok: false,
      metodo: 'qz',
      mensagem: mensagemFalhaQzTray({
        destino: destinoImpressoraResumo(nomeImpressora),
        tcp: tcpRef !== null,
        detalhe: msg.slice(0, 180),
      }),
    }
  }
}
