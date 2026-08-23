import { erroImpressao, logImpressao } from '@/src/shared/utils/logImpressaoDelivery'
import type { CreatePrintJobRequest } from '@/src/infrastructure/printing/agent/printJobTypes'
import { buildAgentPrintJob, printAgentBaseUrl } from '@/src/infrastructure/printing/agent/localAgentClient'

export type PrintDeliveryCupomInput = CreatePrintJobRequest

export type PrintDeliveryCupomResult = {
  ok: boolean
  duplicate?: boolean
  mensagem?: string
}

function extrairMensagemErro(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback
  const error = (payload as { error?: unknown }).error
  if (typeof error === 'object' && error && 'userMessage' in error) {
    const userMessage = (error as { userMessage?: unknown }).userMessage
    if (typeof userMessage === 'string' && userMessage.trim()) return userMessage.trim()
  }
  if (typeof error === 'string' && error.trim()) return error.trim()
  const message = (payload as { message?: unknown }).message
  if (typeof message === 'string' && message.trim()) return message.trim()
  return fallback
}

function mensagemFalhaRede(agentUrl: string): string {
  return `Não foi possível falar com o agente de impressão em ${agentUrl}. Abra o agent.exe neste PC (ícone na bandeja) e tente de novo.`
}

/**
 * Envia o cupom direto ao agente local neste PC (`127.0.0.1:38471`).
 * O destino é a impressora física (nome Windows ou tcp://IP:porta).
 */
export async function printDeliveryCupom(
  input: PrintDeliveryCupomInput
): Promise<PrintDeliveryCupomResult> {
  const copies = Math.min(20, Math.max(1, input.copies ?? 1))
  const jobId = input.jobId.trim()
  const printerName = input.printerName.trim()
  const agentUrl = printAgentBaseUrl()

  if (typeof window === 'undefined') {
    return { ok: false, mensagem: 'Impressão só no navegador.' }
  }
  if (!jobId || !printerName || !input.document?.content?.length) {
    return { ok: false, mensagem: 'Pedido de impressão incompleto (jobId, impressora física ou documento).' }
  }

  const body = buildAgentPrintJob({ ...input, copies, printerName })

  logImpressao('printDeliveryCupom.agent_local_inicio', {
    jobId,
    printerName,
    copies,
    agentUrl,
    blocos: input.document.content.length,
  })

  try {
    const response = await fetch(`${agentUrl}/v1/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    })

    const payload = (await response.json().catch(() => null)) as
      | {
          error?: string | { userMessage?: string }
          message?: string
          duplicate?: boolean
          status?: string
          result?: string
        }
      | null

    if (!response.ok) {
      const mensagem = extrairMensagemErro(payload, mensagemFalhaRede(agentUrl))
      erroImpressao('printDeliveryCupom.agent_local_http', {
        status: response.status,
        mensagem,
        jobId,
        printerName,
        agentUrl,
      })
      return { ok: false, mensagem }
    }

    logImpressao('printDeliveryCupom.agent_local_sucesso', {
      jobId,
      printerName,
      duplicate: Boolean(payload?.duplicate),
      status: payload?.status ?? null,
      result: payload?.result ?? null,
    })
    return {
      ok: true,
      duplicate: Boolean(payload?.duplicate),
    }
  } catch (error) {
    const mensagem = mensagemFalhaRede(agentUrl)
    erroImpressao(
      'printDeliveryCupom.agent_local_excecao',
      { mensagem, jobId, printerName, agentUrl },
      error
    )
    return { ok: false, mensagem }
  }
}
