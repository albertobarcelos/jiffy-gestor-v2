import { mapOperacaoCaixaTerminalToPrintDocument } from '@/src/application/caixa-terminal/mapOperacaoCaixaTerminalToPrintDocument'
import type { OperacaoCaixaTerminalDetalhadaDTO } from '@/src/application/dto/caixa-terminal/OperacaoCaixaTerminalDTO'
import type { EstacaoImpressaoMapeamento } from '@/src/domain/estacao-impressao/EstacaoImpressao'
import {
  printDeliveryCupom,
  type PrintDeliveryCupomResult,
} from '@/src/infrastructure/printing/printDeliveryCupom'
import {
  TOAST_CAIXA_FECHAMENTO_SEM_IMPRESSORA,
  TOAST_CAIXA_FECHAMENTO_SEM_VINCULO_PC,
  temImpressoraExpedicaoConfigurada,
} from '@/src/shared/utils/deliveryImpressoraExpedicao'
import { resolverNomeImpressoraExpedicaoEstacao } from '@/src/infrastructure/printing/resolverImpressoraExpedicaoEstacao'
import { fetchGestorApi } from '@/src/infrastructure/api/fetchGestorApi'
import { textoErroCorpoApi } from '@/src/infrastructure/api/apiClient'

export async function imprimirCupomFechamentoCaixaTerminal(params: {
  operacao: OperacaoCaixaTerminalDetalhadaDTO
  impressoraExpedicaoId: string | null | undefined
  mapeamentos: EstacaoImpressaoMapeamento[]
  reprintKey?: string
}): Promise<PrintDeliveryCupomResult> {
  if (!temImpressoraExpedicaoConfigurada(params.impressoraExpedicaoId)) {
    return { ok: false, mensagem: TOAST_CAIXA_FECHAMENTO_SEM_IMPRESSORA }
  }

  const printerName = resolverNomeImpressoraExpedicaoEstacao(
    params.impressoraExpedicaoId,
    params.mapeamentos
  )
  if (!printerName) {
    return { ok: false, mensagem: TOAST_CAIXA_FECHAMENTO_SEM_VINCULO_PC }
  }

  const document = mapOperacaoCaixaTerminalToPrintDocument(params.operacao)
  const sufixoJob = params.reprintKey?.trim() || String(Date.now())

  return printDeliveryCupom({
    jobId: `fechamento-caixa-terminal-${params.operacao.id}-${sufixoJob}`,
    printerName,
    document,
    copies: 1,
  })
}

/** Busca operação (detalhado) e imprime na impressora de expedição deste PC. */
export async function imprimirFechamentoCaixaTerminalPorId(params: {
  token: string
  operacaoCaixaId: string
  impressoraExpedicaoId: string | null | undefined
  mapeamentos: EstacaoImpressaoMapeamento[]
  reprintKey?: string
}): Promise<PrintDeliveryCupomResult> {
  const id = params.operacaoCaixaId.trim()
  if (!id) return { ok: false, mensagem: 'Operação de caixa inválida para impressão.' }

  const response = await fetchGestorApi(
    `/api/caixa/operacao-caixa-terminal/${encodeURIComponent(id)}?tipoRetorno=detalhado`,
    {
      headers: { Authorization: `Bearer ${params.token}` },
    }
  )
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    return {
      ok: false,
      mensagem: textoErroCorpoApi(body) || `Erro ${response.status}`,
    }
  }

  const operacao = (await response.json()) as OperacaoCaixaTerminalDetalhadaDTO
  if (!operacao?.id) {
    return { ok: false, mensagem: 'Não foi possível montar o cupom de fechamento.' }
  }

  return imprimirCupomFechamentoCaixaTerminal({
    operacao,
    impressoraExpedicaoId: params.impressoraExpedicaoId,
    mapeamentos: params.mapeamentos,
    reprintKey: params.reprintKey,
  })
}
