import type { QueryClient } from '@tanstack/react-query'
import type { CaixaEstacaoAtualDTO } from '@/src/application/dto/caixa-estacao/OperacaoCaixaEstacaoDTO'
import {
  aplicarSangriaNoResumoCaixa,
  aplicarSuprimentoNoResumoCaixa,
  resumoInicialCaixaAbertoComSuprimento,
} from '@/src/domain/caixa-estacao/regrasCaixaEstacao'

export type MovimentacaoCaixaEstacaoTipo = 'sangria' | 'suprimento'

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
