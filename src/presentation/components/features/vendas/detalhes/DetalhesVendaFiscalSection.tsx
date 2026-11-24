'use client'

import type { ReactNode } from 'react'
import type {
  ResumoFiscalPainelDTO,
  VendaPainelDetalheDTO,
} from '@/src/application/dto/VendaPainelDetalheDTO'
import {
  statusFiscalEhEmitida,
  textoCampoFiscal,
} from '@/src/application/mappers/VendaPainelDetalheMapper'
import { StatusFiscalBadge } from '@/src/presentation/components/features/fiscal'
import {
  abrirDocumentoFiscalPdf,
  tipoDocFiscalFromModelo,
} from '@/src/presentation/utils/abrirDocumentoFiscalPdf'
import { formatDateTimePtBr } from '@/src/presentation/utils/vendas/detalhesVendaExibicao'

type Props = {
  venda: VendaPainelDetalheDTO
  resumoFiscalParaExibicao: ResumoFiscalPainelDTO
  nomeTerminalResumoFiscal: string | null
  nomeEmpresaResumoFiscal: string | null
}

export function DetalhesVendaFiscalSection({
  venda,
  resumoFiscalParaExibicao,
  nomeTerminalResumoFiscal,
  nomeEmpresaResumoFiscal,
}: Props) {
  const formatDateTime = formatDateTimePtBr

  return (
                  <div className="mb-4 p-2">
                    <div className="flex flex-col gap-3 bg-gray-50/90 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <h2 className="text-lg font-semibold text-primary-text">
                        Resumo Fiscal
                      </h2>
                      {Boolean(
                        resumoFiscalParaExibicao.documentoFiscalId &&
                          String(resumoFiscalParaExibicao.documentoFiscalId).trim() !== ''
                      ) &&
                        statusFiscalEhEmitida(
                          resumoFiscalParaExibicao.status,
                          venda.statusFiscal
                        ) && (
                          <button
                            type="button"
                            className="shrink-0 rounded-lg border-2 border-primary px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
                            onClick={() => {
                              void abrirDocumentoFiscalPdf(
                                String(resumoFiscalParaExibicao.documentoFiscalId).trim(),
                                tipoDocFiscalFromModelo(resumoFiscalParaExibicao.modelo)
                              )
                            }}
                          >
                            Ver{' '}
                            {tipoDocFiscalFromModelo(resumoFiscalParaExibicao.modelo) === 'NFE'
                              ? 'NFe'
                              : 'NFCe'}
                          </button>
                        )}
                    </div>
                    <div className="mb-2 border-t border-dashed border-gray-400" />
                    <div className="flex flex-col gap-1 md:px-2">
                      {(
                        [
                          {
                            label: 'Retorno SEFAZ',
                            value: textoCampoFiscal(resumoFiscalParaExibicao.retornoSefaz),
                            rowClassName:
                              resumoFiscalParaExibicao.status === 'REJEITADA'
                                ? 'bg-red-50 text-red-700'
                                : resumoFiscalParaExibicao.retornoSefaz
                                  ? 'bg-blue-50 text-primary-text'
                                  : undefined,
                            multilineValue: true,
                          },
                          {
                            label: 'Status',
                            value: resumoFiscalParaExibicao.status ? (
                              <StatusFiscalBadge status={resumoFiscalParaExibicao.status} />
                            ) : (
                              '—'
                            ),
                          },
                          {
                            label: 'Chave fiscal',
                            value: textoCampoFiscal(resumoFiscalParaExibicao.chaveFiscal),
                          },
                          {
                            label: 'Código retorno',
                            value: textoCampoFiscal(resumoFiscalParaExibicao.codigoRetorno),
                          },
                          {
                            label: 'Terminal',
                            value:
                              nomeTerminalResumoFiscal ??
                              textoCampoFiscal(resumoFiscalParaExibicao.terminalId),
                          },
                          {
                            label: 'Modelo',
                            value:
                              resumoFiscalParaExibicao.modelo != null
                                ? String(resumoFiscalParaExibicao.modelo)
                                : '—',
                          },
                          {
                            label: 'Número',
                            value:
                              resumoFiscalParaExibicao.numero != null
                                ? String(resumoFiscalParaExibicao.numero)
                                : '—',
                          },
                          {
                            label: 'Série',
                            value: textoCampoFiscal(resumoFiscalParaExibicao.serie),
                          },
                          {
                            label: 'Empresa',
                            value:
                              nomeEmpresaResumoFiscal ??
                              textoCampoFiscal(resumoFiscalParaExibicao.empresaId),
                          },
                          {
                            label: 'Data criação',
                            value: resumoFiscalParaExibicao.dataCriacao
                              ? formatDateTime(resumoFiscalParaExibicao.dataCriacao)
                              : '—',
                          },
                          {
                            label: 'Data emissão',
                            value: resumoFiscalParaExibicao.dataEmissao
                              ? formatDateTime(resumoFiscalParaExibicao.dataEmissao)
                              : '—',
                          },
                          {
                            label: 'Última modificação',
                            value: resumoFiscalParaExibicao.dataUltimaModificacao
                              ? formatDateTime(resumoFiscalParaExibicao.dataUltimaModificacao)
                              : '—',
                          },
                        ] as {
                          label: string
                          value: ReactNode
                          rowClassName?: string
                          multilineValue?: boolean
                        }[]
                      ).map(({ label, value, rowClassName, multilineValue }, index) => {
                        const zebra =
                          rowClassName ??
                          (index % 2 === 0 ? 'bg-white' : 'bg-gray-50')
                        return (
                          <div
                            key={label}
                            className={`flex items-start justify-between gap-2 rounded-lg px-1 py-1.5 text-xs md:px-2 md:text-sm ${zebra} ${
                              rowClassName ? 'text-inherit' : 'text-primary-text'
                            }`}
                          >
                            <span className="shrink-0 pt-0.5">{label}:</span>
                            <span
                              className={`max-w-[65%] text-right font-medium break-words ${
                                multilineValue ? 'whitespace-pre-wrap' : ''
                              }`}
                            >
                              {value}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
  )
}
