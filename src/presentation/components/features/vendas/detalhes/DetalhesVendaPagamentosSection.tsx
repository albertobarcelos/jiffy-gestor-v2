'use client'

import type {
  MeioPagamentoPainelDTO,
  VendaPainelDetalheDTO,
} from '@/src/application/dto/VendaPainelDetalheDTO'
import {
  formatCurrencyBrl,
  formatDateTimePtBr,
  nomeExibicaoUsuario,
} from '@/src/presentation/utils/vendas/detalhesVendaExibicao'

type Props = {
  venda: VendaPainelDetalheDTO
  nomesUsuarios: Record<string, string>
  nomesMeiosPagamento: Record<string, MeioPagamentoPainelDTO>
  trocoCalculado: number
}

export function DetalhesVendaPagamentosSection({
  venda,
  nomesUsuarios,
  nomesMeiosPagamento,
  trocoCalculado,
}: Props) {
  const formatCurrency = formatCurrencyBrl
  const formatDateTime = formatDateTimePtBr

  return (
              <div className="mb-4 px-2">
                <h2 className="mb-2 text-lg font-semibold text-primary-text">
                  Pagamentos Realizados
                </h2>
                <div className="mb-3 border-t border-dashed border-gray-400"></div>

                <div className="space-y-2">
                  {venda.pagamentos
                    ?.filter(p => {
                      const isCancelado =
                        p.cancelado === true ||
                        (p.dataCancelamento !== null && p.dataCancelamento !== undefined)

                      const usaTef = p.isTefUsed === true
                      // Oculta só TEF pendente de confirmação em pagamento ainda ativo
                      // (cancelados permanecem visíveis no histórico mesmo com TEF não confirmado)
                      if (usaTef && !isCancelado) {
                        const tefConfirmado = p.isTefConfirmed === true
                        if (!tefConfirmado) {
                          return false
                        }
                      }

                      return true
                    })
                    .map((pagamento, index) => {
                      const meio = nomesMeiosPagamento[pagamento.meioPagamentoId]
                      const formaPagamento = meio?.formaPagamentoFiscal || ''
                      const isCancelado =
                        pagamento.cancelado === true ||
                        (pagamento.dataCancelamento !== null &&
                          pagamento.dataCancelamento !== undefined)

                      const getIcon = () => {
                        if (formaPagamento.toLowerCase().includes('dinheiro')) return '💵'
                        if (
                          formaPagamento.toLowerCase().includes('credito') ||
                          formaPagamento.toLowerCase().includes('debito')
                        )
                          return '💳'
                        if (formaPagamento.toLowerCase().includes('pix')) return '📱'
                        return '💳'
                      }

                      return (
                        <div
                          key={index}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                            isCancelado ? 'bg-error/20' : 'bg-[#4BD08A]'
                          }`}
                        >
                          <div
                            className={`flex h-[62px] w-[68px] flex-shrink-0 items-center justify-center rounded-lg ${
                              isCancelado ? 'bg-error/30' : 'bg-primary'
                            }`}
                          >
                            <span className="text-2xl text-white">{getIcon()}</span>
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-primary-text">
                              {meio?.nome || 'Meio de pagamento desconhecido'}
                              {isCancelado && (
                                <span className="ml-2 text-xs font-semibold text-error">
                                  (CANCELADO)
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-secondary-text">
                              {formatDateTime(pagamento.dataCriacao)}
                            </div>
                            <div className="text-sm font-semibold text-primary-text">
                              {formatCurrency(pagamento.valor)}
                            </div>
                            {pagamento.isTefUsed === true &&
                            pagamento.isTefConfirmed === true &&
                            (pagamento.bandeiraCartao || pagamento.codigoAutorizacao) ? (
                              <div className="text-xs text-secondary-text">
                                {[pagamento.bandeiraCartao, pagamento.codigoAutorizacao ? `Aut. ${pagamento.codigoAutorizacao}` : null]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </div>
                            ) : null}
                            <div className="text-xs text-secondary-text">
                              PDV Resp.:{' '}
                              {nomeExibicaoUsuario(pagamento.realizadoPorId, nomesUsuarios)}
                            </div>
                            {isCancelado && pagamento.canceladoPorId && (
                              <div className="mt-1 text-xs text-error">
                                Cancelado por:{' '}
                                {nomeExibicaoUsuario(pagamento.canceladoPorId, nomesUsuarios)}
                              </div>
                            )}
                            {isCancelado && pagamento.dataCancelamento && (
                              <div className="text-xs text-error">
                                Cancelado em: {formatDateTime(pagamento.dataCancelamento)}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}

                  {/* Troco - Código original comentado (vem da API) */}
                  {/* {venda.troco != null && Number(venda.troco) > 0 && (
                    <div className="px-3 py-2 rounded-lg bg-white shadow-sm">
                      <span className="text-sm font-semibold text-primary-text ">
                        Troco: {formatCurrency(venda.troco)}
                      </span>
                    </div>
                  )} */}

                  {/* Troco calculado no frontend */}
                  {trocoCalculado > 0 && (
                    <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
                      <span className="text-sm font-semibold text-primary-text">
                        Troco: {formatCurrency(trocoCalculado)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
  )
}
