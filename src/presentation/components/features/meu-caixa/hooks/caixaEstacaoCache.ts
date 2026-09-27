import type { QueryClient } from '@tanstack/react-query'
import type { CaixaEstacaoAtualDTO } from '@/src/application/dto/caixa-estacao/OperacaoCaixaEstacaoDTO'

type ResumoCaixaEstacao = {
  totalSuprimento: number
  totalSangria: number
  valorLiquidoDinheiroCaixa: number
}

function round2(valor: number): number {
  return Number(valor.toFixed(2))
}

function aplicarSangriaNoResumoCaixa(resumo: ResumoCaixaEstacao, valor: number): ResumoCaixaEstacao {
  return {
    ...resumo,
    totalSangria: round2(resumo.totalSangria + valor),
    valorLiquidoDinheiroCaixa: round2(resumo.valorLiquidoDinheiroCaixa - valor),
  }
}

function aplicarSuprimentoNoResumoCaixa(resumo: ResumoCaixaEstacao, valor: number): ResumoCaixaEstacao {
  return {
    ...resumo,
    totalSuprimento: round2(resumo.totalSuprimento + valor),
    valorLiquidoDinheiroCaixa: round2(resumo.valorLiquidoDinheiroCaixa + valor),
  }
}

function resumoInicialCaixaAbertoComSuprimento(valor: number): ResumoCaixaEstacao {
  return {
    totalSuprimento: round2(valor),
    totalSangria: 0,
    valorLiquidoDinheiroCaixa: round2(valor),
  }
}

export type MovimentacaoCaixaEstacaoTipo = 'sangria' | 'suprimento'

export function caixaEstacaoMovimentacoesQueryKey(
  empresaId: string,
  estacaoGestorId: string,
  tipo: 'sangrias' | 'suprimentos'
) {
  return ['tenant', empresaId, 'caixa-estacao', 'movimentacoes', tipo, estacaoGestorId.trim()] as const
}

export function invalidateMovimentacoesCaixaEstacaoQueries(
  queryClient: QueryClient,
  empresaId: string,
  estacaoGestorId: string,
  tipo?: MovimentacaoCaixaEstacaoTipo
) {
  const id = estacaoGestorId.trim()
  if (!id) return Promise.resolve()
  if (tipo) {
    const apiTipo = tipo === 'suprimento' ? 'suprimentos' : 'sangrias'
    return queryClient.invalidateQueries({
      queryKey: caixaEstacaoMovimentacoesQueryKey(empresaId, id, apiTipo),
    })
  }
  return queryClient.invalidateQueries({
    queryKey: ['tenant', empresaId, 'caixa-estacao', 'movimentacoes'],
  })
}

export function caixaEstacaoCurrentQueryKey(empresaId: string, estacaoGestorId: string) {
  return ['tenant', empresaId, 'caixa-estacao', 'current', estacaoGestorId] as const
}

/** Força reconsulta do caixa (abertura implícita por venda/finalização não atualiza cache sozinha). */
export function invalidateCaixaEstacaoAtualQueries(
  queryClient: QueryClient,
  empresaId: string,
  estacaoGestorId?: string | null
) {
  if (estacaoGestorId?.trim()) {
    return queryClient.invalidateQueries({
      queryKey: caixaEstacaoCurrentQueryKey(empresaId, estacaoGestorId.trim()),
    })
  }
  return queryClient.invalidateQueries({
    queryKey: ['tenant', empresaId, 'caixa-estacao', 'current'],
  })
}

/** Atualiza o resumo local antes da resposta da API — feedback instantâneo no painel. */
export function aplicarMovimentacaoCaixaEstacaoOptimista(
  atual: CaixaEstacaoAtualDTO | undefined,
  tipo: MovimentacaoCaixaEstacaoTipo,
  valor: number,
  estacaoGestorId: string
): CaixaEstacaoAtualDTO {
  if (!atual?.operacao) {
    if (tipo !== 'suprimento') return atual ?? { aberta: false, operacao: null }
    return {
      aberta: true,
      operacao: {
        id: 'optimistic',
        status: 'aberto',
        empresaId: '',
        dataAbertura: new Date().toISOString(),
        dataFechamento: null,
        fechadoPorAtor: null,
        abertoPorAtor: { id: '', type: '', sourceReference: '', nome: '' },
        estacao: { id: estacaoGestorId, nome: '' },
        resumoCaixa: resumoInicialCaixaAbertoComSuprimento(valor),
      },
    }
  }

  const resumoAtual = atual.operacao.resumoCaixa ?? {
    totalSuprimento: 0,
    totalSangria: 0,
    valorLiquidoDinheiroCaixa: 0,
  }

  const resumoCaixa =
    tipo === 'sangria'
      ? aplicarSangriaNoResumoCaixa(resumoAtual, valor)
      : aplicarSuprimentoNoResumoCaixa(resumoAtual, valor)

  return {
    ...atual,
    aberta: true,
    operacao: {
      ...atual.operacao,
      resumoCaixa,
    },
  }
}
