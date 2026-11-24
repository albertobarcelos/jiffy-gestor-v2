'use client'

import { MdShare } from 'react-icons/md'
import type { VendaPainelDetalheDTO } from '@/src/application/dto/VendaPainelDetalheDTO'
import { StatusFiscalBadge } from '@/src/presentation/components/features/fiscal'
import {
  formatDateTimePtBr,
  nomeExibicaoUsuario,
  textoDocumentoCpfCnpj,
} from '@/src/presentation/utils/vendas/detalhesVendaExibicao'
import {
  statusVendaPainel,
  statusVendaPainelColor,
} from '@/src/presentation/utils/vendas/detalhesVendaCalculos'

type Props = {
  venda: VendaPainelDetalheDTO
  nomesUsuarios: Record<string, string>
  nomeCliente: string | null
  /** Workaround sync: datas com Z falso (hora local etiquetada como UTC). */
  datasComoHorarioLocalWallClock?: boolean
}

export function DetalhesVendaInfoSection({
  venda,
  nomesUsuarios,
  nomeCliente,
  datasComoHorarioLocalWallClock = false,
}: Props) {
  const statusVenda = statusVendaPainel(venda)
  const statusColor = statusVendaPainelColor(statusVenda)
  const dateOpts = datasComoHorarioLocalWallClock
    ? { asLocalWallClock: true as const }
    : undefined
  const formatDateTime = (value: string) => formatDateTimePtBr(value, dateOpts)

  return (
                  <div className="mb-2 p-2">
                    <h2 className="flex items-center justify-between text-lg font-semibold text-primary-text">
                      <span>Informações da Venda</span>
                      {venda.vendaCompartilhada ? (
                        <span
                          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary/40 text-primary/70"
                          title="Compartilhamento ativo"
                          aria-label="Compartilhamento ativo"
                        >
                          <MdShare
                            size={12}
                            className="relative -translate-x-[1px] shrink-0 leading-none"
                          />
                        </span>
                      ) : null}
                    </h2>
                <div className="mb-2 border-t border-dashed border-gray-400"></div>

                <div className="space-y-2 md:px-2">
                  {/* Status */}
                  <div
                    className={`flex justify-between rounded-lg px-3 py-2 ${statusColor} text-xs text-white md:text-sm`}
                  >
                    Status: <span className="font-semibold">{statusVenda}</span>
                  </div>

                  {/* Aberto por */}
                  <div className="flex justify-between rounded-lg bg-white px-1 text-xs text-primary-text md:text-sm">
                    <span>Aberto por:</span>
                    <span>{nomeExibicaoUsuario(venda.abertoPorId, nomesUsuarios)}</span>
                  </div>

                  {/* Última Alteração por - Só exibe quando statusMesa estiver aberta */}
                  {venda.ultimoResponsavelId && venda.statusMesa === 'aberta' && (
                    <div className="flex justify-between rounded-lg bg-white px-1 text-xs text-primary-text md:text-sm">
                      <span>Última Alteração por:</span>
                      <span>
                        {nomeExibicaoUsuario(venda.ultimoResponsavelId, nomesUsuarios)}
                      </span>
                    </div>
                  )}

                  {/* Finalizado Por - Só exibe se a venda não foi cancelada e statusMesa não estiver aberta */}
                  {venda.ultimoResponsavelId &&
                    !venda.canceladoPorId &&
                    venda.statusMesa !== 'aberta' && (
                      <div className="flex justify-between rounded-lg bg-white px-1 text-xs text-primary-text md:text-sm">
                        <span>Finalizado Por:</span>
                        <span>
                          {nomeExibicaoUsuario(venda.ultimoResponsavelId, nomesUsuarios)}
                        </span>
                      </div>
                    )}

                  {/* Cancelado Por */}
                  {venda.canceladoPorId && (
                    <div className="flex justify-between rounded-lg bg-white px-1 text-xs text-error md:text-sm">
                      <span>Cancelado Por:</span>
                      <span className="font-semibold">
                        {nomeExibicaoUsuario(venda.canceladoPorId, nomesUsuarios)}
                      </span>
                    </div>
                  )}

                  {/* Data/Hora de Cancelamento */}
                  {venda.dataCancelamento && (
                    <div className="flex justify-between rounded-lg bg-white px-1 text-xs text-error md:text-sm">
                      <span>Cancelado em:</span>
                      <span className="font-semibold">
                        {formatDateTime(venda.dataCancelamento)}
                      </span>
                    </div>
                  )}

                  {/* Código do Terminal */}
                  {venda.codigoTerminal && (
                    <div className="flex justify-between rounded-lg bg-white px-1 text-xs text-primary-text md:text-sm">
                      <span>Código do Terminal:</span>
                      <span>#{venda.codigoTerminal}</span>
                    </div>
                  )}

                  {/* Data/Hora de Criação */}
                  <div className="flex justify-between rounded-lg bg-white px-1 text-xs text-primary-text md:text-sm">
                    <span>Data/Hora Abertura:</span>
                    <span>{formatDateTime(venda.dataCriacao)}</span>
                  </div>

                  {venda.dataUltimaModificacao && (
                    <div className="flex justify-between rounded-lg bg-white px-1 text-xs text-primary-text md:text-sm">
                      <span>Última alteração:</span>
                      <span>{formatDateTime(venda.dataUltimaModificacao)}</span>
                    </div>
                  )}

                  {venda.dataUltimoProdutoLancado && (
                    <div className="flex justify-between rounded-lg bg-white px-1 text-xs text-primary-text md:text-sm">
                      <span>Último produto lançado:</span>
                      <span>{formatDateTime(venda.dataUltimoProdutoLancado)}</span>
                    </div>
                  )}

                  {/* Data/Hora de Finalização */}
                  {venda.dataFinalizacao && (
                    <div className="flex justify-between rounded-lg bg-white px-1 text-xs text-primary-text md:text-sm">
                      <span>Data/Hora Finalização:</span>
                      <span>{formatDateTime(venda.dataFinalizacao)}</span>
                    </div>
                  )}

                  {/* Cliente Vinculado */}
                  {venda.clienteId && nomeCliente && (
                    <div className="flex justify-between rounded-lg bg-white px-1 text-xs text-primary-text md:text-sm">
                      <span>Cliente Vinculado:</span>
                      <span>{nomeCliente}</span>
                    </div>
                  )}

                  {textoDocumentoCpfCnpj(venda.documentoCpfCnpj) && (
                    <div className="flex justify-between rounded-lg bg-white px-1 text-xs text-primary-text md:text-sm">
                      <span>CPF/CNPJ:</span>
                      <span>{textoDocumentoCpfCnpj(venda.documentoCpfCnpj)}</span>
                    </div>
                  )}

                  {/* Identificação da Venda */}
                  {venda.identificacao && (
                    <div className="flex justify-between rounded-lg bg-white px-1 text-xs text-primary-text md:text-sm">
                      <span>Identificação da Venda:</span>
                      <span>{venda.identificacao}</span>
                    </div>
                  )}

                  {/* Origem da Venda */}
                  {venda.origem && (
                    <div className="flex justify-between rounded-lg bg-white px-3 text-sm text-primary-text">
                      <span>Origem:</span>
                      <span>{venda.origem}</span>
                    </div>
                  )}

                  {/* Status Fiscal */}
                  {venda.statusFiscal && (
                    <div className="flex items-center justify-between rounded-lg bg-white px-3 text-sm text-primary-text">
                      <span>Status Fiscal:</span>
                      <StatusFiscalBadge status={venda.statusFiscal} />
                    </div>
                  )}

                  {/* Documento Fiscal ID */}
                  {venda.documentoFiscalId && (
                    <div className="flex justify-between rounded-lg bg-green-50 px-3 text-sm text-primary-text">
                      <span>Documento Fiscal ID:</span>
                      <span className="text-xs">{venda.documentoFiscalId}</span>
                    </div>
                  )}

                  {/* Retorno SEFAZ (motivo da rejeição/autorização) */}
                  {venda.retornoSefaz && (
                    <div
                      className={`rounded-lg px-3 py-2 text-sm ${
                        venda.statusFiscal === 'REJEITADA'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-blue-50 text-primary-text'
                      }`}
                    >
                      <span className="font-semibold">Retorno SEFAZ: </span>
                      <span>{venda.retornoSefaz}</span>
                    </div>
                  )}
                </div>
              </div>
  )
}
