'use client'

import type { ResumoFinanceiroPainel } from '@/src/presentation/utils/vendas/detalhesVendaCalculos'
import { formatNumberPtBr } from '@/src/presentation/utils/vendas/detalhesVendaExibicao'

type Props = {
  resumoFinanceiro: ResumoFinanceiroPainel
}

export function DetalhesVendaResumoFinanceiroSection({ resumoFinanceiro }: Props) {
  const formatNumber = formatNumberPtBr

  return (
              <div className="mb-4 px-2">
                <h2 className="mb-2 text-sm font-semibold text-primary-text">
                  Resumo Financeiro
                </h2>
                <div className="border-t border-dashed border-gray-400"></div>

                <div className="space-y-1.5 rounded-lg px-4 py-2">
                  {/* A: todos os produtos lançados (inclui cancelados / removidos) */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-800">
                      A - Total itens lançados (+)
                    </span>
                    <span className="text-right text-xs font-semibold tabular-nums text-gray-800">
                      {formatNumber(resumoFinanceiro.totalItensLancados)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-800">
                     B - Itens cancelados (-)
                    </span>
                    <span className="text-right text-xs font-semibold tabular-nums text-gray-800 line-through">
                      {formatNumber(resumoFinanceiro.totalItensCancelados)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-800">
                      C - Total taxas (+)
                    </span>
                    <span className="text-right text-xs font-semibold tabular-nums text-gray-800">
                      {formatNumber(resumoFinanceiro.totalTaxas)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-800">
                      D - Total acréscimos à venda (+)
                    </span>
                    <span className="text-right text-xs font-semibold tabular-nums text-gray-800">
                      {formatNumber(resumoFinanceiro.totalAcrescimoVenda)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-800">
                      E - Total descontos à venda (-)
                    </span>
                    <span className="text-right text-xs font-semibold tabular-nums text-gray-800">
                      {resumoFinanceiro.totalDescontoVenda > 0
                        ? `-${formatNumber(resumoFinanceiro.totalDescontoVenda)}`
                        : formatNumber(resumoFinanceiro.totalDescontoVenda)}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between border-t border-gray-400 pt-1.5">
                    <span className="text-xs font-medium text-gray-800">
                      F - Total (A − B + C + D − E)
                    </span>
                    <span className="text-right text-xs font-semibold tabular-nums text-gray-800">
                      {formatNumber(resumoFinanceiro.totalResumo)}
                    </span>
                  </div>
                </div>
              </div>
  )
}
