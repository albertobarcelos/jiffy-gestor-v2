import {
  statusFiscalPermiteAbaNotaFiscal,
  statusFiscalPermiteCancelarNota,
} from '@/src/domain/services/pedido/RegrasFiscaisVenda'
import type { OrigemVenda, TabelaOrigemVenda } from '@/src/domain/types/vendaDetalhe'

export function resolverStatusFiscalExibicao(
  statusFiscalUnificado: string | null | undefined,
  statusFiscalDetalhe: string | null | undefined,
  resumoFiscalStatus: string | null | undefined
): string | null {
  return (
    (statusFiscalUnificado && String(statusFiscalUnificado).trim()) ||
    (statusFiscalDetalhe && String(statusFiscalDetalhe).trim()) ||
    (resumoFiscalStatus && String(resumoFiscalStatus).trim()) ||
    null
  )
}

export function podeExibirAbaNotaFiscalDetalhe(params: {
  modoVisualizacao: boolean | undefined
  tabelaOrigemVenda: TabelaOrigemVenda
  statusFiscal: string | null
  origem: OrigemVenda | null
}): boolean {
  const { modoVisualizacao, tabelaOrigemVenda, statusFiscal, origem } = params
  if (!modoVisualizacao) return false
  if (!statusFiscalPermiteAbaNotaFiscal(statusFiscal)) return false

  if (tabelaOrigemVenda === 'venda') {
    return true
  }

  if (origem === 'GESTOR') return true

  return statusFiscalPermiteAbaNotaFiscal(statusFiscal)
}

export function podeExibirAbaDadosEntregaDetalhe(params: {
  modoVisualizacao: boolean | undefined
  tipoVenda: string | null | undefined
}): boolean {
  if (!params.modoVisualizacao) return false
  const tipo = String(params.tipoVenda ?? '')
    .trim()
    .toLowerCase()
  return tipo === 'entrega'
}

export function podeExibirCancelarNotaFiscalDetalhe(params: {
  vendaId: string | undefined
  currentStep: number
  statusFiscal: string | null
  resumoFiscalStatus: string | null | undefined
}): boolean {
  const { vendaId, currentStep, statusFiscal, resumoFiscalStatus } = params
  if (!vendaId || currentStep !== 4) return false
  return statusFiscalPermiteCancelarNota(resumoFiscalStatus, statusFiscal, null)
}
