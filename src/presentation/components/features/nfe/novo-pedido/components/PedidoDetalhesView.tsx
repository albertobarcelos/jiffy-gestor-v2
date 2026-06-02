'use client'

import { Button } from '@/src/presentation/components/ui/button'
import { Label } from '@/src/presentation/components/ui/label'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { abrirDocumentoFiscalPdf, tipoDocFiscalFromModelo } from '@/src/presentation/utils/abrirDocumentoFiscalPdf'
import { showToast } from '@/src/shared/utils/toast'
import { MdCreditCard, MdDelete } from 'react-icons/md'
import { pagamentoComDestaqueCanceladoDetalhes } from '@/src/domain/services/pedido/RegrasPagamentoPedido'
import { statusFiscalEhEmitida } from '@/src/domain/services/pedido/RegrasFiscaisVenda'
import {
  rotuloOrigemExibicao,
  taxaEntregaTemValor,
} from '@/src/application/mappers/PedidoDisplayMapper'
import { PedidoDetalhesInfo } from './PedidoDetalhesInfo'
import { PedidoDetalhesNotaFiscal } from './PedidoDetalhesNotaFiscal'
import { PedidoDetalhesPagamentos } from './PedidoDetalhesPagamentos'
import { PedidoDetalhesProdutos } from './PedidoDetalhesProdutos'
import { PedidoDetalhesEntrega } from './PedidoDetalhesEntrega'
import { useNovoPedidoDetalheContext } from '../context/NovoPedidoDetalheContext'
import { useNovoPedidoFormContext } from '../context/NovoPedidoFormContext'
import { useNovoPedidoUIContext } from '../context/NovoPedidoUIContext'

export function PedidoDetalhesView() {
  const {
    abaDetalhesPedido,
    handleAbrirEdicaoProdutoDetalhes,
    isLoadingVenda,
    podeEditarPagamentoEntregaEmAberto,
    podeExibirAbaNotaFiscal,
    resumoFinanceiroDetalhes,
    resumoFiscal,
    statusFiscalUnificado,
    detalhesPedidoMeta,
    detalhesEntregaPedido,
  } = useNovoPedidoDetalheContext()
  const { currentStep } = useNovoPedidoUIContext()
  const { origem } = useNovoPedidoFormContext()
  const {
    adicionarPagamentoPorCard,
    calcularTotalProduto,
    fluxoPagamentoEntrega,
    formatarDataDetalhePedido,
    formatarDataHoraResumoFiscal,
    formatarDescontoAcrescimo,
    formatarNumeroComMilhar,
    formatarUsuarioPorId,
    formatarValorComplemento,
    formatarValorRecebido,
    meiosPagamento,
    nomesMeiosPagamentoPedido,
    obterIconeMeioPagamento,
    pagamentoModoCobranca,
    pagamentos,
    pagamentosVisiveisNaAbaDetalhes,
    produtos,
    removerPagamento,
    rotuloModeloNfe,
    rotuloStatusResumoModal,
    setValorRecebido,
    totalItensPedido,
    totalPagamentos,
    totalPagamentosLancados,
    totalProdutos,
    trocoLancamento,
    valorAPagarLancamento,
    valorRecebido,
    dataVenda,
    clienteNome,
  } = useNovoPedidoFormContext()

  return (
    <>            {/* STEP 4: Detalhes da Venda (visualização ou após criar pedido) */}
            {currentStep === 4 && !isLoadingVenda && (
              <div className="space-y-4 py-2">
                {abaDetalhesPedido === 'notaFiscal' && podeExibirAbaNotaFiscal ? (
                  <PedidoDetalhesNotaFiscal
                    role="tabpanel"
                    aria-labelledby="tab-detalhes-nota-fiscal"
                  >
                    <div className="flex flex-col gap-3 rounded-lg border-2 border-primary/20 bg-gray-50/90 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="font-nunito text-lg font-semibold text-primary">
                        Resumo da Nota Fiscal modelo: {rotuloModeloNfe(resumoFiscal?.modelo)}
                      </h3>
                      {resumoFiscal?.documentoFiscalId &&
                        statusFiscalEhEmitida(resumoFiscal.status, statusFiscalUnificado) && (
                          <Button
                            type="button"
                            variant="outlined"
                            className="shrink-0 !border-primary !text-primary hover:!bg-primary/5"
                            onClick={() => {
                              void abrirDocumentoFiscalPdf(
                                resumoFiscal.documentoFiscalId!,
                                tipoDocFiscalFromModelo(resumoFiscal.modelo)
                              )
                            }}
                          >
                            Ver{' '}
                            {tipoDocFiscalFromModelo(resumoFiscal.modelo) === 'NFE'
                              ? 'NFe'
                              : 'NFCe'}
                          </Button>
                        )}
                    </div>

                    {!resumoFiscal ? (
                      <div className="rounded-lg border border-dashed border-amber-300/80 bg-amber-50/90 px-6 py-10 text-center">
                        <p className="font-nunito text-sm leading-relaxed text-amber-950/90">
                          Nenhum resumo fiscal disponível para esta venda. Isso pode ocorrer se
                          ainda não houver nota emitida ou se o backend não retornou o objeto{' '}
                          <span className="font-semibold">resumoFiscal</span>.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                        <div className="divide-y divide-gray-100">
                          {(
                            [
                              {
                                label: 'Status',
                                value: resumoFiscal.status ?? '—',
                              },
                              {
                                label: 'Retorno SEFAZ',
                                value: resumoFiscal.retornoSefaz ?? '—',
                                multiline: true,
                              },
                              {
                                label: 'Código retorno',
                                value: resumoFiscal.codigoRetorno ?? '—',
                              },
                              {
                                label: 'Número ' + rotuloModeloNfe(resumoFiscal.modelo ?? null),
                                value:
                                  resumoFiscal.numero != null ? String(resumoFiscal.numero) : '—',
                              },
                              {
                                label: 'Série',
                                value: resumoFiscal.serie ?? '—',
                              },
                              {
                                label: 'Data de emissão',
                                value: formatarDataHoraResumoFiscal(resumoFiscal.dataEmissao),
                              },
                              {
                                label: 'Modelo',
                                value: rotuloModeloNfe(resumoFiscal.modelo ?? null),
                              },
                              {
                                label: 'Chave fiscal',
                                value: resumoFiscal.chaveFiscal ?? '—',
                                monospace: true,
                              },
                              {
                                label: 'Data de criação',
                                value: formatarDataHoraResumoFiscal(resumoFiscal.dataCriacao),
                              },
                              {
                                label: 'Última modificação',
                                value: formatarDataHoraResumoFiscal(
                                  resumoFiscal.dataUltimaModificacao
                                ),
                              },
                            ] as const
                          ).map((row, idx) => (
                            <div
                              key={row.label}
                              className={`flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 ${
                                idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/80'
                              }`}
                            >
                              <span className="shrink-0 text-xs font-semibold text-gray-600 sm:text-sm">
                                {row.label}
                              </span>
                              <span
                                className={`font-nunito break-words text-right text-sm text-gray-900 sm:max-w-[min(100%,28rem)] sm:text-left ${
                                  'monospace' in row && row.monospace ? 'font-mono text-sm' : ''
                                } ${
                                  'multiline' in row && row.multiline ? 'whitespace-pre-wrap' : ''
                                }`}
                              >
                                {row.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </PedidoDetalhesNotaFiscal>
                ) : (
                  <>
                    {abaDetalhesPedido === 'dadosEntrega' && (
                      <PedidoDetalhesEntrega
                        role="tabpanel"
                        aria-labelledby="tab-detalhes-dados-entrega"
                      />
                    )}

                    {abaDetalhesPedido === 'infoPedido' && (
                      <PedidoDetalhesInfo
                        role="tabpanel"
                        aria-labelledby="tab-detalhes-info-pedido"
                      >
                        <h3 className="text-lg font-semibold">Informações do Pedido</h3>
                        <div className="flex flex-col gap-3 text-sm">
                          <div className="flex justify-between rounded-lg bg-white px-1">
                            <span className="text-gray-600">Data:</span>
                            <span className="font-medium">
                              {(dataVenda ? new Date(dataVenda) : new Date()).toLocaleString(
                                'pt-BR',
                                {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between px-1">
                            <span className="text-gray-600">Origem:</span>
                            <span className="font-medium">
                              {rotuloOrigemExibicao(origem)}
                            </span>
                          </div>
                          <div className="flex justify-between rounded-lg bg-white px-1">
                            <span className="text-gray-600">Status:</span>
                            <span className="font-medium">{rotuloStatusResumoModal}</span>
                          </div>
                          {clienteNome && (
                            <div className="flex justify-between px-1">
                              <span className="text-gray-600">Cliente:</span>
                              <span className="font-medium">{clienteNome}</span>
                            </div>
                          )}

                          <div className="flex justify-between rounded-lg bg-white px-1">
                            <span className="text-gray-600">Total de Itens:</span>
                            <span className="font-medium">
                              {totalItensPedido} {totalItensPedido === 1 ? 'produto' : 'produtos'}
                            </span>
                          </div>
                          <div className="flex justify-between px-1">
                            <span className="text-gray-600">Aberto por:</span>
                            <span className="font-medium">
                              {formatarUsuarioPorId(detalhesPedidoMeta?.abertoPorId)}
                            </span>
                          </div>
                          {detalhesPedidoMeta?.ultimoResponsavelId && (
                            <div className="flex justify-between rounded-lg bg-white px-1">
                              <span className="text-gray-600">Última alteração por:</span>
                              <span className="font-medium">
                                {formatarUsuarioPorId(detalhesPedidoMeta.ultimoResponsavelId)}
                              </span>
                            </div>
                          )}
                          {detalhesPedidoMeta?.canceladoPorId && (
                            <div className="flex justify-between px-1">
                              <span className="text-gray-600">Cancelado por:</span>
                              <span className="font-medium text-red-600">
                                {formatarUsuarioPorId(detalhesPedidoMeta.canceladoPorId)}
                              </span>
                            </div>
                          )}
                          {detalhesPedidoMeta?.codigoTerminal && (
                            <div className="flex justify-between rounded-lg bg-white px-1">
                              <span className="text-gray-600">Código do terminal:</span>
                              <span className="font-medium">
                                {detalhesPedidoMeta.codigoTerminal}
                              </span>
                            </div>
                          )}
                          {detalhesPedidoMeta?.identificacao && (
                            <div className="flex justify-between px-1">
                              <span className="text-gray-600">Identificação:</span>
                              <span className="font-medium">
                                {detalhesPedidoMeta.identificacao}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between rounded-lg bg-white px-1">
                            <span className="text-gray-600">Solicitar emissão fiscal:</span>
                            <span className="font-medium">
                              {detalhesPedidoMeta?.solicitarEmissaoFiscal ? 'Sim' : 'Não'}
                            </span>
                          </div>
                          {detalhesPedidoMeta?.dataUltimaModificacao && (
                            <div className="flex justify-between px-1">
                              <span className="text-gray-600">Última modificação:</span>
                              <span className="font-medium">
                                {formatarDataDetalhePedido(
                                  detalhesPedidoMeta.dataUltimaModificacao
                                )}
                              </span>
                            </div>
                          )}
                          {detalhesPedidoMeta?.dataUltimoProdutoLancado && (
                            <div className="flex justify-between rounded-lg bg-white px-1">
                              <span className="text-gray-600">Último produto lançado:</span>
                              <span className="font-medium">
                                {formatarDataDetalhePedido(
                                  detalhesPedidoMeta.dataUltimoProdutoLancado
                                )}
                              </span>
                            </div>
                          )}
                          {detalhesPedidoMeta?.dataFinalizacao && (
                            <div className="flex justify-between px-1">
                              <span className="text-gray-600">Data finalização:</span>
                              <span className="font-medium">
                                {formatarDataDetalhePedido(detalhesPedidoMeta.dataFinalizacao)}
                              </span>
                            </div>
                          )}
                          {detalhesPedidoMeta?.dataCancelamento && (
                            <div className="flex justify-between rounded-lg bg-white px-1">
                              <span className="text-gray-600">Data cancelamento:</span>
                              <span className="font-medium text-red-600">
                                {formatarDataDetalhePedido(detalhesPedidoMeta.dataCancelamento)}
                              </span>
                            </div>
                          )}
                        </div>
                      </PedidoDetalhesInfo>
                    )}

                    {/* Lista de Produtos (Visualização) */}
                    {abaDetalhesPedido === 'listaProdutos' && (
                      <PedidoDetalhesProdutos
                        role="tabpanel"
                        aria-labelledby="tab-detalhes-lista-produtos"
                      >
                        <div className="p-2">
                          <h3 className="mb-2 text-lg font-semibold">Produtos do Pedido</h3>
                          {produtos.length > 0 ? (
                            <div className="space-y-1">
                              {/* Cabeçalho da tabela */}
                              <div className="mb-2 flex gap-2 border-b border-gray-300 pb-2">
                                <div className="flex w-[60px] flex-shrink-0 items-center justify-center">
                                  <span className="text-center text-xs font-semibold text-gray-700">
                                    Qtd
                                  </span>
                                </div>
                                <div className="flex-[4]">
                                  <span className="text-xs font-semibold text-gray-700">
                                    Produto
                                  </span>
                                </div>
                                <div className="flex flex-1 justify-end">
                                  <span className="text-right text-xs font-semibold text-gray-700">
                                    Desc./Acres.
                                  </span>
                                </div>
                                <div className="flex flex-1 justify-end">
                                  <span className="text-right text-xs font-semibold text-gray-700">
                                    Val Unit.
                                  </span>
                                </div>
                                <div className="flex flex-1 justify-end">
                                  <span className="text-right text-xs font-semibold text-gray-700">
                                    Total
                                  </span>
                                </div>
                              </div>
                              {/* Linhas de produtos */}
                              <div className="space-y-1">
                                {produtos.map((produto: any, index: number) => {
                                  // Total do produto: usar valorFinal vindo do backend (já calculado com desconto/acréscimo)
                                  const totalProdutoComComplementos =
                                    produto.valorFinal !== null && produto.valorFinal !== undefined
                                      ? produto.valorFinal
                                      : calcularTotalProduto(produto)

                                  return (
                                    <div key={index} className="space-y-0">
                                      {/* Linha do Produto Principal */}
                                      <div
                                        className={`flex items-center gap-1 rounded ${
                                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                        } cursor-pointer`}
                                        onDoubleClick={() =>
                                          handleAbrirEdicaoProdutoDetalhes(produto.produtoId)
                                        }
                                        title="Duplo clique para editar este produto"
                                      >
                                        {/* Quantidade */}
                                        <div className="w-[60px] flex-shrink-0">
                                          <span className="block text-center text-xs text-gray-900">
                                            {Math.floor(produto.quantidade)}
                                          </span>
                                        </div>
                                        {/* Nome do Produto */}
                                        <div className="min-w-0 flex-[4]">
                                          <span className="block truncate text-xs text-gray-900">
                                            {produto.nome}
                                          </span>
                                        </div>
                                        {/* Desconto/Acréscimo */}
                                        <div className="flex-1">
                                          <span className="block text-right text-xs text-gray-600">
                                            {formatarDescontoAcrescimo(produto)}
                                          </span>
                                        </div>
                                        {/* Valor Unitário */}
                                        <div className="flex-1">
                                          <span className="block text-right text-xs text-gray-900">
                                            {formatarNumeroComMilhar(produto.valorUnitario)}
                                          </span>
                                        </div>
                                        {/* Total */}
                                        <div className="flex-1">
                                          <span className="block text-right text-xs font-semibold text-gray-900">
                                            R${' '}
                                            {formatarNumeroComMilhar(totalProdutoComComplementos)}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Linhas dos Complementos */}
                                      {produto.complementos.map((complemento: any, compIndex: number) => {
                                        const compKey = `comp-${index}-${complemento.grupoId}-${complemento.id}`

                                        return (
                                          <div
                                            key={compKey}
                                            className={`-mt-0.5 flex items-center gap-1 rounded ${
                                              index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                            }`}
                                            style={{ minHeight: '24px' }}
                                          >
                                            {/* Quantidade do Complemento */}
                                            <div className="w-[60px] flex-shrink-0 pl-4">
                                              <span className="block text-right text-xs text-gray-600">
                                                {complemento.quantidade}
                                              </span>
                                            </div>
                                            {/* Nome do Complemento com indentação */}
                                            <div className="min-w-0 flex-[4] pl-4">
                                              <span className="block truncate text-xs leading-tight text-gray-600">
                                                {complemento.nome}
                                              </span>
                                            </div>
                                            {/* Espaço vazio para Desconto/Acréscimo (complementos não têm) */}
                                            <div className="flex-1"></div>
                                            {/* Valor Unitário do Complemento - Apenas exibição */}
                                            <div className="flex-1">
                                              <span className="block text-right text-xs leading-tight text-gray-600">
                                                {formatarValorComplemento(
                                                  complemento.valor,
                                                  complemento.tipoImpactoPreco
                                                )}
                                              </span>
                                            </div>
                                            {/* Espaço vazio onde seria o Total (complementos não têm total próprio) */}
                                            <div className="flex-1"></div>
                                          </div>
                                        )
                                      })}
                                      <div className="flex justify-start px-6 pb-1 text-[11px] text-gray-500">
                                        <span>
                                          Por: {formatarUsuarioPorId(produto.lancadoPorId)} -{' '}
                                          {formatarDataDetalhePedido(
                                            produto.dataLancamento || null
                                          )}
                                        </span>
                                      </div>
                                      {produto.removido && (
                                        <div className="flex justify-between px-1 pb-1 text-[11px] text-red-600">
                                          <span>
                                            Removido por:{' '}
                                            {formatarUsuarioPorId(produto.removidoPorId)}
                                          </span>
                                          <span>
                                            {formatarDataDetalhePedido(produto.dataRemocao || null)}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center py-4">
                              <p className="text-sm text-gray-500">Nenhum produto selecionado</p>
                            </div>
                          )}
                        </div>
                      </PedidoDetalhesProdutos>
                    )}

                    {/* Total do Pedido */}
                    {abaDetalhesPedido === 'listaProdutos' && (
                      <div className="space-y-2">
                        {taxaEntregaTemValor(detalhesEntregaPedido?.taxaEntrega) && (
                          <div className="flex items-center justify-end gap-2 text-sm">
                            <span className="font-semibold text-gray-700">Taxa de entrega:</span>
                            <span className="font-semibold text-primary">
                              +{' '}
                              {transformarParaReal(
                                Number(detalhesEntregaPedido?.taxaEntrega?.valor)
                              )}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-sm font-semibold text-gray-700">
                            Total do Pedido:
                          </span>
                          <span className="text-lg font-semibold text-primary">
                            {transformarParaReal(totalProdutos)}
                          </span>
                        </div>
                      </div>
                    )}

                    {abaDetalhesPedido === 'listaProdutos' && resumoFinanceiroDetalhes && (
                      <div className="rounded-lg border bg-white px-4 py-3">
                        <h3 className="mb-2 text-lg font-semibold">Resumo Financeiro</h3>
                        <div className="space-y-1.5 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-700">A - Total de itens lançados (+)</span>
                            <span className="font-semibold text-gray-900">
                              {formatarNumeroComMilhar(resumoFinanceiroDetalhes.totalItensLancados)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-700">B - Taxas de entrega (+)</span>
                            <span className="font-semibold text-gray-900">
                              {formatarNumeroComMilhar(
                                resumoFinanceiroDetalhes.totalTaxasEntrega
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-700">C - Total de itens cancelados (-)</span>
                            <span className="font-semibold text-gray-900 line-through">
                              {formatarNumeroComMilhar(
                                resumoFinanceiroDetalhes.totalItensCancelados
                              )}
                            </span>
                          </div>
                          <div className="mt-1 flex justify-between border-t pt-1.5">
                            <span className="text-gray-700">
                              D - Total de itens (A + B - C)
                            </span>
                            <span className="font-semibold text-gray-900">
                              {formatarNumeroComMilhar(resumoFinanceiroDetalhes.totalDosItens)}
                            </span>
                          </div>
                          <div className="mt-3 flex justify-between">
                            <span className="text-gray-700">Total de descontos na conta</span>
                            <span className="font-semibold text-gray-900">
                              {formatarNumeroComMilhar(
                                resumoFinanceiroDetalhes.totalDescontosConta
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-700">Total de acréscimos na conta</span>
                            <span className="font-semibold text-gray-900">
                              {formatarNumeroComMilhar(
                                resumoFinanceiroDetalhes.totalAcrescimosConta
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Pagamentos (se status finalizada ou pendente emissão) */}
                    {abaDetalhesPedido === 'pagamentos' && (
                      <PedidoDetalhesPagamentos
                        role="tabpanel"
                        aria-labelledby="tab-detalhes-pagamentos"
                      >
                        <h3 className="mb-2 text-lg font-semibold">Pagamentos</h3>

                        {/* Total Pago e Troco */}
                        <div className="mb-2 border-t pt-2 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-gray-700">
                              Total do Pedido:
                            </span>
                            <span className="text-lg font-semibold text-primary">
                              {transformarParaReal(totalProdutos)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between rounded-lg bg-gray-100 p-1">
                            <span className="font-semibold text-gray-700">
                              Total Recebido (Efetivo):
                            </span>
                            <span className="text-base font-semibold text-green-700">
                              {transformarParaReal(totalPagamentos)}
                            </span>
                          </div>
                          {(totalPagamentosLancados - totalPagamentos) > 0 && (
                            <div className="mt-1 flex items-center justify-between rounded-lg bg-amber-50 p-1">
                              <span className="font-semibold text-gray-700">
                                A receber na entrega:
                              </span>
                              <span className="text-base font-semibold text-amber-700">
                                {transformarParaReal(totalPagamentosLancados - totalPagamentos)}
                              </span>
                            </div>
                          )}
                          {trocoLancamento > 0 && (
                            <div className="mt-2 flex items-center justify-between">
                              <span className="font-semibold text-gray-700">Troco:</span>
                              <span className="text-base font-semibold text-green-600">
                                {transformarParaReal(trocoLancamento)}
                              </span>
                            </div>
                          )}
                        </div>

                        {podeEditarPagamentoEntregaEmAberto && (
                          <div className="mb-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                            <div className="mb-2">
                              <div>
                                <p className="text-sm font-semibold text-primary-text">
                                  Ajustar cobrança do entregador
                                </p>
                                <p className="text-xs text-secondary-text">
                                  Altere a forma, o valor a receber ou o troco antes de finalizar o pedido.
                                </p>
                              </div>
                            </div>

                            <div className="mb-2 grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  showToast.warning(
                                    'Tipo de cobrança bloqueado em venda já criada. Edite apenas forma, valor ou troco.'
                                  )
                                }}
                                aria-disabled="true"
                                className={`cursor-not-allowed rounded-lg border px-3 py-2 text-sm font-semibold opacity-80 ${
                                  fluxoPagamentoEntrega === 'cobrar_entregador'
                                    ? 'border-primary bg-primary text-white'
                                    : 'border-gray-200 bg-white text-primary-text'
                                }`}
                              >
                                Cobrar na entrega
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  showToast.warning(
                                    'Tipo de cobrança bloqueado em venda já criada. Edite apenas forma, valor ou troco.'
                                  )
                                }}
                                aria-disabled="true"
                                className={`cursor-not-allowed rounded-lg border px-3 py-2 text-sm font-semibold opacity-80 ${
                                  fluxoPagamentoEntrega === 'ja_pago'
                                    ? 'border-primary bg-primary text-white'
                                    : 'border-gray-200 bg-white text-primary-text'
                                }`}
                              >
                                Recebido pelo entregador
                              </button>
                            </div>

                            <div className="mb-2 flex items-center gap-2">
                              <span className="font-medium text-primary-text">Valor a receber:</span>
                              <input
                                type="text"
                                value={valorRecebido}
                                onChange={e => {
                                  const valorFormatado = formatarValorRecebido(e.target.value)
                                  setValorRecebido(valorFormatado)
                                }}
                                placeholder="0,00"
                                className="rounded-lg border-2 bg-white p-1 text-right font-semibold transition-colors hover:border-primary-text"
                              />
                            </div>

                            <div className="scrollbar-thin flex gap-3 overflow-x-auto pb-2">
                              {meiosPagamento.map((meio: any) => {
                                const Icone = obterIconeMeioPagamento(meio.getNome())
                                const semSaldoParaAdicionar =
                                  valorAPagarLancamento <= 0 && !valorRecebido.trim()
                                return (
                                  <button
                                    key={meio.getId()}
                                    type="button"
                                    onClick={() => adicionarPagamentoPorCard(meio.getId())}
                                    disabled={semSaldoParaAdicionar}
                                    className={`flex w-[150px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 border-secondary bg-secondary p-2 text-white transition-all hover:brightness-110 ${
                                      semSaldoParaAdicionar ? 'cursor-not-allowed opacity-50' : ''
                                    }`}
                                  >
                                    <Icone className="h-8 w-8 shrink-0 text-white" />
                                    <span className="line-clamp-2 w-full text-center text-xs font-medium leading-tight text-white">
                                      {meio.getNome()}
                                    </span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Cards das Formas de Pagamento */}
                        <div className="mb-2">
                          <Label className="mb-2 block text-base font-semibold">
                            {pagamentoModoCobranca
                              ? 'Formas previstas para cobrança'
                              : 'Formas de Pagamento Utilizadas'}
                          </Label>
                          <div className="flex flex-wrap gap-3">
                            {pagamentosVisiveisNaAbaDetalhes.map((pagamento: any, index: number) => {
                              const meio = meiosPagamento.find(
                                (m: any) => m.getId() === pagamento.meioPagamentoId
                              )
                              const nomeMeio =
                                meio?.getNome() ||
                                nomesMeiosPagamentoPedido[pagamento.meioPagamentoId] ||
                                'Meio de pagamento'
                              const Icone = meio
                                ? obterIconeMeioPagamento(meio.getNome())
                                : MdCreditCard
                              const emCancelado = pagamentoComDestaqueCanceladoDetalhes(pagamento)
                              const usuarioPagamento = emCancelado
                                ? pagamento.canceladoPorId || pagamento.realizadoPorId
                                : pagamento.realizadoPorId
                              const dataPagamento = emCancelado
                                ? pagamento.dataCancelamento || pagamento.dataCriacao
                                : pagamento.dataCriacao

                              return (
                                <div
                                  key={index}
                                  className={`flex min-w-[120px] flex-col items-center justify-center gap-1 rounded-lg border-2 p-3 ${
                                    emCancelado
                                      ? 'border-red-400 bg-red-50'
                                      : 'border-primary bg-white'
                                  }`}
                                >
                                  <Icone
                                    className={`h-8 w-8 ${emCancelado ? 'text-red-600' : 'text-primary'}`}
                                  />
                                  <span
                                    className={`text-center text-xs font-medium ${emCancelado ? 'text-red-900' : ''}`}
                                  >
                                    {nomeMeio}
                                  </span>
                                  <span
                                    className={`text-sm font-semibold ${emCancelado ? 'text-red-700' : 'text-primary'}`}
                                  >
                                    {transformarParaReal(pagamento.valor)}
                                  </span>
                                  {podeEditarPagamentoEntregaEmAberto && (
                                    <button
                                      type="button"
                                      onClick={() => removerPagamento(index, pagamento.id)}
                                      className="mt-1 inline-flex items-center gap-1 rounded border border-red-200 px-2 py-0.5 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                                    >
                                      <MdDelete className="h-3.5 w-3.5" />
                                      Remover
                                    </button>
                                  )}
                                  {emCancelado && (
                                    <span className="text-center text-[11px] font-semibold text-red-600">
                                      Pagamento Cancelado
                                    </span>
                                  )}
                                  {!emCancelado && (pagamento.cobrarNaEntrega || pagamento.naoEfetivo) && (
                                    <span className="text-center text-[11px] font-semibold text-amber-600">
                                      A cobrar na entrega
                                    </span>
                                  )}
                                  {!emCancelado && !pagamento.cobrarNaEntrega && !pagamento.naoEfetivo && (
                                    <span className="text-center text-[11px] font-semibold text-green-600">
                                      Efetivo / Pago
                                    </span>
                                  )}
                                  <span
                                    className={`text-center text-[11px] ${emCancelado ? 'text-red-800/80' : 'text-gray-500'}`}
                                  >
                                    {emCancelado ? 'Cancelado por' : 'Por'}:{' '}
                                    {formatarUsuarioPorId(usuarioPagamento)}
                                  </span>
                                  {dataPagamento && (
                                    <span
                                      className={`text-center text-[11px] ${emCancelado ? 'text-red-800/80' : 'text-gray-500'}`}
                                    >
                                      {formatarDataDetalhePedido(dataPagamento)}
                                    </span>
                                  )}
                                  {pagamento.isTefUsed && (
                                    <span
                                      className={`text-center text-[11px] ${emCancelado ? 'text-red-700' : 'text-gray-500'}`}
                                    >
                                      TEF:{' '}
                                      {pagamento.isTefConfirmed === true
                                        ? 'Confirmado'
                                        : pagamento.isTefConfirmed === false
                                          ? 'Não confirmado'
                                          : '—'}
                                    </span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                          {pagamentos.length === 0 && (
                            <p className="py-4 text-sm text-gray-500">
                              Nenhum pagamento registrado.
                            </p>
                          )}
                          {pagamentos.length > 0 && pagamentosVisiveisNaAbaDetalhes.length === 0 && (
                            <p className="py-4 text-sm text-gray-500">
                              Nenhum pagamento efetivo para exibir (ex.: tentativas TEF pendentes de
                              confirmação).
                            </p>
                          )}
                        </div>
                      </PedidoDetalhesPagamentos>
                    )}
                  </>
                )}
              </div>
            )}
    </>
  )
}