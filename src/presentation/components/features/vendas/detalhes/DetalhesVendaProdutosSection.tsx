'use client'

import type { VendaPainelDetalheDTO } from '@/src/application/dto/VendaPainelDetalheDTO'
import { sufixoTituloAjusteVenda, tipoEhPercentual } from '@/src/application/mappers/VendaPainelDetalheMapper'
import {
  formatCurrencyBrl,
  formatDateTimePtBr,
  formatNumberPtBr,
  nomeExibicaoUsuario,
  rotuloTipoComplemento,
  textoPizza,
} from '@/src/presentation/utils/vendas/detalhesVendaExibicao'
import type { AjustesTotaisVendaPainel } from '@/src/presentation/utils/vendas/detalhesVendaCalculos'
import {
  calcularValorComplemento,
  calcularValorProduto,
  statusVendaPainel,
} from '@/src/presentation/utils/vendas/detalhesVendaCalculos'

type Props = {
  venda: VendaPainelDetalheDTO
  nomesUsuarios: Record<string, string>
  ajustesTotaisVenda: AjustesTotaisVendaPainel
  totalVendaCalculado: number
  temTaxaComValor: boolean
}

export function DetalhesVendaProdutosSection({
  venda,
  nomesUsuarios,
  ajustesTotaisVenda,
  totalVendaCalculado,
  temTaxaComValor,
}: Props) {
  const statusVenda = statusVendaPainel(venda)
  const formatCurrency = formatCurrencyBrl
  const formatNumber = formatNumberPtBr
  const formatDateTime = formatDateTimePtBr

  return (
              <div className="mb-2 p-2">
                <h2 className="text-lg font-semibold text-primary-text">Produtos Lançados</h2>
                <div className="mb-2 border-t border-dashed border-gray-400"></div>

                <div className="space-y-2">
                  {venda.produtosLancados?.map((produto, index) => {
                    const valorTotal = calcularValorProduto(produto)
                    const isRemovido = produto.removido
                    const isVendaCancelada = statusVenda === 'CANCELADA'
                    // Se a venda está cancelada, todos os produtos são considerados cancelados
                    const isCancelado = isVendaCancelada || isRemovido
                    const pizzaTexto =
                      produto.tipoItem === 'pizza' ? textoPizza(produto.pizzaLancada) : null
                    const observacoes = (produto.observacoes ?? []).filter(
                      obs => obs.observacao && obs.observacao.trim() !== ''
                    )
                    return (
                      <div
                        key={index}
                        className={`rounded-lg px-1 md:px-3 ${
                          isCancelado ? 'bg-error/20' : 'bg-white'
                        }`}
                      >
                        <div className="flex flex-col gap-1">
                          {/* Linha do produto principal */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-2 items-center gap-2">
                              <span className="text-xs font-semibold text-primary-text md:text-sm">
                                {produto.quantidade}x {produto.nomeProduto} (
                                {formatNumber(produto.valorUnitario)})
                              </span>
                            </div>
                            {/* Exibe acréscimo e/ou desconto se existirem */}
                            <div className="flex flex-1 flex-col justify-start gap-1 text-xs text-secondary-text md:flex-row md:text-sm">
                              {(() => {
                                // Tenta obter acréscimo de diferentes possíveis campos
                                const acrescimoRaw =
                                  (produto as any).acrescimo ??
                                  (produto as any).valorAcrescimo ??
                                  (produto as any).acrescimoValor ??
                                  null
                                const tipoAcrescimoRaw =
                                  produto.tipoAcrescimo ??
                                  (produto as any).tipoAcrescimoValor ??
                                  (produto as any).tipoAcrescimoProduto ??
                                  null

                                // Tenta obter desconto de diferentes possíveis campos
                                const descontoRaw =
                                  produto.desconto ??
                                  (produto as any).valorDesconto ??
                                  (produto as any).descontoValor ??
                                  null
                                const tipoDescontoRaw =
                                  produto.tipoDesconto ??
                                  (produto as any).tipoDescontoValor ??
                                  (produto as any).tipoDescontoProduto ??
                                  null

                                const acrescimoValue =
                                  acrescimoRaw !== undefined &&
                                  acrescimoRaw !== null &&
                                  acrescimoRaw !== ''
                                    ? typeof acrescimoRaw === 'string'
                                      ? parseFloat(acrescimoRaw)
                                      : acrescimoRaw
                                    : null
                                const descontoValue =
                                  descontoRaw !== undefined &&
                                  descontoRaw !== null &&
                                  descontoRaw !== ''
                                    ? typeof descontoRaw === 'string'
                                      ? parseFloat(descontoRaw)
                                      : descontoRaw
                                    : null

                                const elementos = []

                                // Exibe acréscimo se existir e for maior que 0
                                if (
                                  acrescimoValue !== null &&
                                  !isNaN(acrescimoValue) &&
                                  acrescimoValue > 0
                                ) {
                                  const tipoAcrescimo = tipoAcrescimoRaw || 'fixo' // Default para fixo se não especificado
                                  const valorExibir =
                                    tipoAcrescimo === 'porcentagem'
                                      ? `${Math.round(acrescimoValue * 100)}%`
                                      : formatNumber(acrescimoValue)
                                  elementos.push(
                                    <span key="acrescimo" className="text-success">
                                      Acresc. +{valorExibir}
                                    </span>
                                  )
                                }

                                // Exibe desconto se existir e for maior que 0
                                if (
                                  descontoValue !== null &&
                                  !isNaN(descontoValue) &&
                                  descontoValue > 0
                                ) {
                                  const tipoDesconto = tipoDescontoRaw || 'fixo' // Default para fixo se não especificado
                                  const valorExibir =
                                    tipoDesconto === 'porcentagem'
                                      ? `${Math.round(descontoValue * 100)}%`
                                      : formatNumber(descontoValue)
                                  elementos.push(
                                    <span key="desconto" className="text-error">
                                      Desc. -{valorExibir}
                                    </span>
                                  )
                                }

                                return elementos.length > 0 ? elementos : null
                              })()}
                            </div>
                            <div
                              className={`flex flex-1 items-center justify-end text-sm font-semibold text-primary-text ${isCancelado ? 'line-through' : ''}`}
                            >
                              {formatCurrency(valorTotal)}
                            </div>
                          </div>

                          {pizzaTexto ? (
                            <p className="ml-2 text-xs text-secondary-text md:ml-7">{pizzaTexto}</p>
                          ) : null}
                          {produto.incidiuTaxa === true && temTaxaComValor ? (
                            <p className="ml-2 text-xs text-secondary-text md:ml-7">
                              Incide taxa de serviço
                            </p>
                          ) : null}

                          {/* Linhas dos complementos */}
                          {produto.complementos && produto.complementos.length > 0 ? (
                            <div className="ml-2 space-y-1 md:ml-7">
                              {produto.complementos.map((complemento, compIndex) => {
                                const valorTotalComplemento = calcularValorComplemento(complemento)
                                const temImpactoPreco = complemento.tipoImpactoPreco !== 'nenhum'
                                const tipoComplemento = rotuloTipoComplemento(complemento.tipoComplemento)

                                let prefix = ''
                                if (temImpactoPreco) {
                                  prefix = complemento.tipoImpactoPreco === 'aumenta' ? '+ ' : '- '
                                }

                                return (
                                  <div
                                    key={compIndex}
                                    className="flex items-center justify-between gap-2"
                                  >
                                    <span className="text-xs text-secondary-text">
                                      {complemento.quantidade}x{' '}
                                      {tipoComplemento ? `${tipoComplemento}: ` : ''}
                                      {complemento.nomeComplemento}
                                      {temImpactoPreco &&
                                        ` (${formatNumber(complemento.valorUnitario)})`}
                                    </span>
                                    <div
                                      className={`text-xs font-semibold text-secondary-text ${isCancelado ? 'line-through' : ''}`}
                                    >
                                      {temImpactoPreco
                                        ? `${prefix}${formatCurrency(valorTotalComplemento)}`
                                        : '-'}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ) : null}

                          {observacoes.map((obs, obsIndex) => (
                            <div
                              key={obs.id || obsIndex}
                              className="ml-2 text-xs text-secondary-text md:ml-7"
                            >
                              Obs.: {obs.observacao}
                            </div>
                          ))}

                          {/* Informações de lançamento */}
                          <div className="mt-1 flex flex-col text-xs text-secondary-text md:ml-7 md:flex-row">
                            <span>Lançado: {formatDateTime(produto.dataLancamento)} |</span>{' '}
                            <span>
                              Usuário: {nomeExibicaoUsuario(produto.lancadoPorId, nomesUsuarios)}
                            </span>
                          </div>

                          {/* Informações de remoção (se produto foi removido) */}
                          {isRemovido && (produto.dataRemocao || produto.removidoPorId) ? (
                            <div className="ml-7 mt-1 text-xs text-error">
                              {produto.dataRemocao
                                ? `Removido em: ${formatDateTime(produto.dataRemocao)}`
                                : null}
                              {produto.dataRemocao && produto.removidoPorId ? ' | ' : null}
                              {produto.removidoPorId
                                ? `Removido por: ${nomeExibicaoUsuario(produto.removidoPorId, nomesUsuarios)}`
                                : null}
                            </div>
                          ) : null}
                          {isRemovido && produto.motivoRemocao ? (
                            <div className="ml-7 text-xs text-error">
                              Motivo: {produto.motivoRemocao}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}

                  {(venda.taxasLancadas?.length ?? 0) > 0 && (
                    <>
                      <div className="my-2 border-t border-dashed border-gray-400" />
                      <p className="mb-1 text-lg font-semibold text-primary-text">
                        Taxas Lançadas
                      </p>
                      {(venda.taxasLancadas ?? []).map(taxa => {
                        const isVendaCancelada = statusVenda === 'CANCELADA'
                        const isTaxaRemovida = Boolean(taxa.dataRemocao?.trim())
                        const isCanceladoTaxa = isVendaCancelada || isTaxaRemovida
                        const valorUnitTaxa = Number(taxa.valor) || 0
                        const qtdTaxa = Number(taxa.quantidade) || 0
                        const totalTaxa = Number(taxa.valorCalculado) || 0
                        const textoUnitarioTaxa = tipoEhPercentual(taxa.tipo)
                          ? `${Math.round(valorUnitTaxa * 100)}%`
                          : formatNumber(valorUnitTaxa)

                        return (
                          <div
                            key={taxa.id || `${taxa.nome}-${taxa.dataLancamento}`}
                            className={`rounded-lg px-1 md:px-3 ${
                              isCanceladoTaxa ? 'bg-error/20' : 'bg-white'
                            }`}
                          >
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="min-w-0 flex-1 text-xs font-semibold text-primary-text md:text-sm">
                                  {qtdTaxa}x {taxa.nome} ({textoUnitarioTaxa})
                                </span>
                                <span
                                  className={`shrink-0 text-sm font-semibold text-primary-text ${isCanceladoTaxa ? 'line-through' : ''}`}
                                >
                                  {formatCurrency(totalTaxa)}
                                </span>
                              </div>
                              <div className="mt-1 flex flex-col text-xs text-secondary-text md:ml-7 md:flex-row md:flex-wrap md:gap-x-1">
                                {taxa.dataLancamento && (
                                  <span>Lançado: {formatDateTime(taxa.dataLancamento)}</span>
                                )}
                                {taxa.dataLancamento && taxa.lancadoPorId && (
                                  <span className="hidden md:inline">|</span>
                                )}
                                {taxa.lancadoPorId && (
                                  <span>
                                    Usuário: {nomeExibicaoUsuario(taxa.lancadoPorId, nomesUsuarios)}
                                  </span>
                                )}
                              </div>
                              {isTaxaRemovida && taxa.removidoPorId && (
                                <div className="ml-7 mt-1 text-xs text-error">
                                  Removido por:{' '}
                                  {nomeExibicaoUsuario(taxa.removidoPorId, nomesUsuarios)}
                                </div>
                              )}
                              {isTaxaRemovida && taxa.dataRemocao && (
                                <div className="ml-7 text-xs text-error">
                                  Removido em: {formatDateTime(taxa.dataRemocao)}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </>
                  )}

                  {ajustesTotaisVenda.mostrarSecao && (
                    <>
                      <div className="my-2 border-t border-dashed border-gray-400" />
                      <p className="mb-1 text-lg font-semibold text-primary-text">
                        Acréscimo/Desconto na Venda
                      </p>
                      {ajustesTotaisVenda.temDesconto && (
                        <div className="rounded-lg bg-white px-1 md:px-3">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between gap-3">
                              <span className="min-w-0 flex-1 text-xs font-semibold text-primary-text md:text-sm">
                                Desconto na venda
                                {sufixoTituloAjusteVenda(venda.tipoDesconto, venda.valorDesconto)}
                              </span>
                              <span className="shrink-0 text-sm font-semibold text-error">
                                -{formatCurrency(ajustesTotaisVenda.valorDescontoExibir ?? 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      {ajustesTotaisVenda.temAcrescimo && (
                        <div className="rounded-lg bg-white px-1 md:px-3">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between gap-3">
                              <span className="min-w-0 flex-1 text-xs font-semibold text-primary-text md:text-sm">
                                Acréscimo na venda
                                {sufixoTituloAjusteVenda(venda.tipoAcrescimo, venda.valorAcrescimo)}
                              </span>
                              <span className="shrink-0 text-sm font-semibold text-primary-text">
                                {formatCurrency(ajustesTotaisVenda.valorAcrescimoExibir ?? 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Total da Venda */}
                  <div className="rounded-lg border-2 border-primary bg-primary/10 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-semibold text-primary-text">
                        Total da Venda:
                      </span>
                      <span
                        className={`text-base font-semibold text-primary ${statusVenda === 'CANCELADA' ? 'line-through' : ''}`}
                      >
                        {formatCurrency(totalVendaCalculado)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
  )
}
