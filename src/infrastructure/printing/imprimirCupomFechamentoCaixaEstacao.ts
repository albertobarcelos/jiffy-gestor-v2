import { mapOperacaoCaixaEstacaoToPrintDocument } from '@/src/application/caixa-estacao/mapOperacaoCaixaEstacaoToPrintDocument'
import type { OperacaoCaixaEstacaoDTO } from '@/src/application/dto/caixa-estacao/OperacaoCaixaEstacaoDTO'
import { mapOperacaoCaixaEstacao } from '@/src/application/mappers/caixa-estacao/OperacaoCaixaEstacaoMapper'
import type { EstacaoImpressaoMapeamento } from '@/src/infrastructure/api/estacoesImpressaoApi'
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
import {
  lerErroCaixaEstacao,
  pathOperacaoCaixaEstacao,
} from '@/src/infrastructure/api/caixaEstacaoBff'

export async function imprimirCupomFechamentoCaixaEstacao(params: {
  operacao: OperacaoCaixaEstacaoDTO
  impressoraExpedicaoId: string | null | undefined
  mapeamentos: EstacaoImpressaoMapeamento[]
  /** Evita dedupe do Jiffy Print ao reimprimir o mesmo fechamento. */
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

  const document = mapOperacaoCaixaEstacaoToPrintDocument(params.operacao)
  const sufixoJob = params.reprintKey?.trim() || String(Date.now())

  return printDeliveryCupom({
    jobId: `fechamento-caixa-${params.operacao.id}-${sufixoJob}`,
    printerName,
    document,
    copies: 1,
  })
}

/** Busca operação fechada (detalhado) e imprime na impressora de expedição deste PC. */
export async function imprimirFechamentoCaixaEstacaoPorId(params: {
  token: string
  operacaoCaixaId: string
  impressoraExpedicaoId: string | null | undefined
  mapeamentos: EstacaoImpressaoMapeamento[]
}): Promise<PrintDeliveryCupomResult> {
  const id = params.operacaoCaixaId.trim()
  if (!id) return { ok: false, mensagem: 'Operação de caixa inválida para impressão.' }

  const response = await fetchGestorApi(pathOperacaoCaixaEstacao(id), {
    headers: { Authorization: `Bearer ${params.token}` },
  })
  if (!response.ok) {
    return {
      ok: false,
      mensagem: await lerErroCaixaEstacao(response),
    }
  }

  const operacao = mapOperacaoCaixaEstacao(await response.json())
  if (!operacao) {
    return { ok: false, mensagem: 'Não foi possível montar o cupom de fechamento.' }
  }

  return imprimirCupomFechamentoCaixaEstacao({
    operacao,
    impressoraExpedicaoId: params.impressoraExpedicaoId,
    mapeamentos: params.mapeamentos,
  })
}
