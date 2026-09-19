'use client'

import { Input } from '@/src/presentation/components/ui/input'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { Label } from '@/src/presentation/components/ui/label'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { resolverModoTaxaEntregaOverride } from '@/src/shared/constants/taxaEntregaPedido'
import {
  estiloCardMeioPagamento,
  varsCardMeioPagamentoLancado,
} from '@/src/shared/utils/corFormaPagamentoFiscal'
import { INFORMACOES_ADICIONAIS_NOTA_MAX } from '@/src/shared/helpers/informacoesAdicionaisNota'
import { MdCreditCard, MdDelete, MdEdit, MdPersonOutline } from 'react-icons/md'
import { PedidoPagamentoStep } from '../../PedidoPagamentoStep'
import { useNovoPedidoFormContext } from '../../../context/NovoPedidoFormContext'
import { useNovoPedidoUIContext } from '../../../context/NovoPedidoUIContext'
import { useNovoPedidoDetalheContext } from '../../../context/NovoPedidoDetalheContext'

/** Mesmas dimensões dos cards de forma de pagamento e dos lançamentos em Detalhes. */
const MEIO_PAGAMENTO_CARD_SIZE_CLASS = 'h-[98px] w-[150px] shrink-0'

export function PedidoPagamentoStepView() {
  const { tipoInicioPedido } = useNovoPedidoDetalheContext()
  const { setSeletorClienteOpen, handleMouseDownMeiosPagamento, hasMovedMeiosPagamentoRef, isDraggingMeiosPagamento, meiosPagamentoScrollRef } =
    useNovoPedidoUIContext()
  const {
    adicionarPagamentoPorCard,
    calcularTotalProduto,
    clienteEntregaVinculado,
    clienteNome,
    formatarValorRecebido,
    fluxoPagamentoEntrega,
    handleRemoveCliente,
    meiosPagamento,
    mostrarLoadingFormasPagamento,
    obterIconeMeioPagamento,
    observacaoNota,
    setObservacaoNota,
    pagamentos,
    pedidoEntregaAceitaPagamentoPendente,
    pedidoGestorComPagamentoNoPasso3,
    produtos,
    removerPagamento,
    rotuloCobrancaPendente,
    rotuloStatusPagamentoExibicao,
    setFluxoPagamentoEntrega,
    setValorRecebido,
    statusPagamentoExibicao,
    subtotalProdutos,
    totalItensPedido,
    totalPagamentos,
    totalPagamentosLancados,
    totalProdutos,
    trocoLancamento,
    valorAPagar,
    valorAPagarLancamento,
    valorRecebido,
    valorTaxaEntrega,
    taxaEntregaId,
    enderecoEntregaCoberturaStatus,
    pedidoComEntrega,
    moradaEntregaSelecionada,
  } = useNovoPedidoFormContext()

  const nomeClienteResumo =
    tipoInicioPedido === 'delivery' ? (clienteEntregaVinculado?.nome ?? '') : clienteNome
  const temCliente = Boolean(nomeClienteResumo.trim())
  const restanteALancarExibicao = pedidoEntregaAceitaPagamentoPendente
    ? valorAPagarLancamento
    : valorAPagar
  const rotuloCampoValorRecebido =
    pedidoEntregaAceitaPagamentoPendente && fluxoPagamentoEntrega === 'cobrar_entregador'
      ? 'Valor a receber:'
      : 'Valor Recebido:'
  const modoTaxa = resolverModoTaxaEntregaOverride(taxaEntregaId)
  const taxaPendente =
    pedidoComEntrega &&
    Boolean(moradaEntregaSelecionada?.id) &&
    modoTaxa === 'automatica' &&
    enderecoEntregaCoberturaStatus === 'pendente'
  const mostrarResumoTaxa = pedidoEntregaAceitaPagamentoPendente && pedidoComEntrega

  return (
    <PedidoPagamentoStep>
      <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold text-gray-800">Resumo do Pedido</Label>
            <span className="text-xs font-medium text-gray-500">
              {totalItensPedido} {totalItensPedido === 1 ? 'item' : 'itens'}
            </span>
          </div>

          <div className="max-h-[180px] overflow-y-auto rounded-lg border border-gray-100 bg-gray-50/50 scrollbar-thin">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-gray-100/90 backdrop-blur-sm">
                <tr className="text-gray-500">
                  <th className="px-3 py-2 font-medium">Produto</th>
                  <th className="px-2 py-2 text-right font-medium">Qtd</th>
                  <th className="px-2 py-2 text-right font-medium">Un.</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {produtos.map((produto, idx) => (
                  <tr key={produto.produtoLancadoId || idx} className="text-gray-700">
                    <td className="px-3 py-2.5 font-medium">
                      <div className="line-clamp-2">{produto.nome}</div>
                      {produto.complementos.length > 0 && (
                        <div className="mt-0.5 text-[10px] text-gray-400">
                          + {produto.complementos.length} comp.
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-right">{produto.quantidade}</td>
                    <td className="px-2 py-2.5 text-right">
                      {transformarParaReal(produto.valorUnitario)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-gray-900">
                      {transformarParaReal(calcularTotalProduto(produto))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <hr className="border-gray-100" />

        <div className="space-y-2">
          <Label className="text-sm font-semibold text-gray-800">Cliente da Nota Fiscal</Label>

          {temCliente ? (
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 transition-colors hover:bg-gray-100/50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <MdPersonOutline size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-900">{nomeClienteResumo}</span>
                  <span className="text-xs text-gray-500">Vinculado ao pedido</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSeletorClienteOpen(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-white hover:text-primary hover:shadow-sm"
                  title="Alterar cliente"
                >
                  <MdEdit size={18} />
                </button>
                {tipoInicioPedido !== 'delivery' && (
                  <button
                    type="button"
                    onClick={handleRemoveCliente}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-white hover:text-red-600 hover:shadow-sm"
                    title="Remover cliente"
                  >
                    <MdDelete size={18} />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSeletorClienteOpen(true)}
              className="group flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50/50 p-4 transition-all hover:border-primary/40 hover:bg-primary/5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary shadow-sm transition-colors group-hover:bg-primary group-hover:text-white">
                <MdPersonOutline size={24} />
              </div>
              <div className="text-center">
                <span className="block text-sm font-semibold text-gray-700 group-hover:text-primary">
                  Vincular cliente
                </span>
                <span className="block text-xs text-gray-500">
                  Obrigatório para emissão de NF-e
                </span>
              </div>
            </button>
          )}
        </div>

        <div className="pt-1">
          <Input
            label="Observação da nota (Opcional)"
            value={observacaoNota}
            onChange={e => setObservacaoNota(e.target.value)}
            placeholder="Ex: Informações complementares para a NFC-e/NF-e..."
            helperText="Enviado na emissão como informações complementares (máx. 3500). O rodapé da empresa é concatenado depois."
            multiline
            minRows={2}
            inputProps={{ maxLength: INFORMACOES_ADICIONAIS_NOTA_MAX }}
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                transition: 'all 0.2s ease-in-out',
                '&:hover': { backgroundColor: '#f3f4f6' },
                '&.Mui-focused': {
                  backgroundColor: '#ffffff',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                },
              },
            }}
          />
        </div>
      </div>

      {pedidoGestorComPagamentoNoPasso3 && (
        <div className="space-y-4">
          <div className="rounded-lg border bg-white px-4">
            <h3 className="text-lg font-semibold">Pagamento</h3>
            <div className="mb-2 space-y-0.5 text-sm">
              {pedidoEntregaAceitaPagamentoPendente && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFluxoPagamentoEntrega('cobrar_entregador')
                      }}
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                        fluxoPagamentoEntrega === 'cobrar_entregador'
                          ? 'border-secondary bg-secondary text-white'
                          : 'border-gray-200 bg-white text-primary-text'
                      }`}
                    >
                      {rotuloCobrancaPendente}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFluxoPagamentoEntrega('ja_pago')
                      }}
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                        fluxoPagamentoEntrega === 'ja_pago'
                          ? 'border-secondary bg-secondary text-white'
                          : 'border-gray-200 bg-white text-primary-text'
                      }`}
                    >
                      Já foi pago
                    </button>
                  </div>
                  <p className="px-1 text-[11px] text-gray-500">
                    A aba vale para o próximo lançamento. Você pode misturar já pago e cobrança na
                    entrega.
                  </p>
                </>
              )}
              {mostrarResumoTaxa && (
                <>
                  <div className="flex items-center justify-between px-1 py-0.5">
                    <span className="font-medium text-gray-700">Produtos:</span>
                    <span className="font-semibold text-gray-900">
                      {transformarParaReal(subtotalProdutos)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-1 py-0.5">
                    <span className="font-medium text-gray-700">Taxa de entrega:</span>
                    <span className="font-semibold text-gray-900">
                      {taxaPendente
                        ? 'Calculando…'
                        : modoTaxa === 'automatica' && !moradaEntregaSelecionada?.id
                          ? 'Cadastre o endereço'
                          : `+ ${transformarParaReal(valorTaxaEntrega)}`}
                    </span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between px-1 py-0.5">
                <span className="font-medium text-gray-700">Total do Pedido:</span>
                <span className="font-semibold text-primary">
                  {transformarParaReal(totalProdutos)}
                </span>
              </div>
              <div className="flex items-center border-t justify-between px-1 py-0.5">
                <span className="font-medium text-gray-700">A pagar:</span>
                <span
                  className={`font-semibold ${
                    restanteALancarExibicao > 0 ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {transformarParaReal(restanteALancarExibicao)}
                </span>
              </div>
              {pedidoEntregaAceitaPagamentoPendente && (
                <div className="flex items-center justify-between px-1 py-0.5">
                  <span className="font-medium text-gray-700">Status pagamento:</span>
                  <span
                    className={`font-semibold ${
                      statusPagamentoExibicao === 'pago'
                        ? 'text-green-600'
                        : statusPagamentoExibicao === 'parcial'
                          ? 'text-amber-600'
                          : 'text-red-600'
                    }`}
                  >
                    {rotuloStatusPagamentoExibicao}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="font-medium text-primary-text">{rotuloCampoValorRecebido}</span>
                <input
                  type="text"
                  value={valorRecebido}
                  onChange={e => setValorRecebido(formatarValorRecebido(e.target.value))}
                  placeholder="0,00"
                  className="rounded-lg border-2 p-1 text-right font-semibold transition-colors hover:border-primary-text"
                />
              </div>
            </div>

            <div className="mb-2">
              <Label className="mb-2 block text-base font-semibold">Forma de Pagamento</Label>
              <div
                ref={meiosPagamentoScrollRef}
                className={`scrollbar-thin flex gap-3 overflow-x-auto pb-2 ${mostrarLoadingFormasPagamento ? 'min-h-[120px] cursor-default' : 'cursor-grab select-none active:cursor-grabbing'}`}
                style={{ scrollbarWidth: 'thin' }}
                onMouseDown={
                  mostrarLoadingFormasPagamento ? undefined : handleMouseDownMeiosPagamento
                }
              >
                {mostrarLoadingFormasPagamento ? (
                  <div className="flex w-full flex-1 items-center justify-center py-2">
                    <JiffyLoading />
                  </div>
                ) : (
                  meiosPagamento.map(meio => {
                    const Icone = obterIconeMeioPagamento(meio.getNome())
                    const estilo = estiloCardMeioPagamento(meio.getFormaPagamentoFiscal())
                    const { labelColor, labelFontWeight, ...estiloCard } = estilo
                    return (
                      <button
                        key={meio.getId()}
                        type="button"
                        onClick={() => {
                          if (!hasMovedMeiosPagamentoRef.current && !isDraggingMeiosPagamento) {
                            adicionarPagamentoPorCard(meio.getId())
                          }
                        }}
                        disabled={valorAPagarLancamento <= 0 && !valorRecebido.trim()}
                        style={estiloCard}
                        className={`flex ${MEIO_PAGAMENTO_CARD_SIZE_CLASS} cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 p-2 transition-all hover:brightness-110 ${valorAPagarLancamento <= 0 && !valorRecebido.trim() ? 'cursor-not-allowed opacity-50' : ''}`}
                      >
                        <Icone className="h-8 w-8 shrink-0" />
                        <span
                          className="line-clamp-2 w-full text-center text-xs leading-tight"
                          style={{
                            color: labelColor,
                            fontWeight: labelFontWeight ?? 500,
                          }}
                        >
                          {meio.getNome()}
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            <div className="space-y-0 border-t pt-1 text-sm leading-snug">
              <div className="flex items-center justify-between px-1 py-0">
                <span className="font-semibold text-gray-700">
                  Total Recebido{tipoInicioPedido === 'delivery' ? ' (Efetivo)' : ''}:
                </span>
                <span className="font-semibold text-green-700">
                  {transformarParaReal(totalPagamentos)}
                </span>
              </div>
              {pedidoEntregaAceitaPagamentoPendente &&
                totalPagamentosLancados - totalPagamentos > 0 && (
                  <div className="flex items-center justify-between px-1 py-1">
                    <span className="font-semibold text-gray-700">A receber na entrega:</span>
                    <span className="font-semibold text-amber-700">
                      {transformarParaReal(totalPagamentosLancados - totalPagamentos)}
                    </span>
                  </div>
                )}
              {trocoLancamento > 0 && (
                <div className="flex items-center justify-between px-1 py-0">
                  <span className="font-semibold text-gray-700">Troco previsto:</span>
                  <span className="font-semibold text-green-600">
                    {transformarParaReal(trocoLancamento)}
                  </span>
                </div>
              )}
            </div>

            {pagamentos.length > 0 && (
              <div className="mt-2 border-t py-2">
                <Label className="mb-2 block text-sm font-semibold">Detalhes:</Label>
                <div className="flex flex-wrap gap-3">
                  {pagamentos.map((pagamento, index) => {
                    const meio = meiosPagamento.find(m => m.getId() === pagamento.meioPagamentoId)
                    const Icone = meio ? obterIconeMeioPagamento(meio.getNome()) : MdCreditCard
                    const varsLancado = varsCardMeioPagamentoLancado(
                      meio?.getFormaPagamentoFiscal() ?? ''
                    )
                    return (
                      <div
                        key={index}
                        style={varsLancado}
                        className={`group relative flex ${MEIO_PAGAMENTO_CARD_SIZE_CLASS} flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-[var(--meio-cor)] bg-[var(--meio-cor)] p-2 text-[var(--meio-texto-forte)] transition-all hover:brightness-110`}
                      >
                        <button
                          onClick={() => removerPagamento(index)}
                          type="button"
                          aria-label="Remover pagamento"
                          className="absolute right-0.5 top-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-transparent p-0 text-current hover:bg-black/10"
                        >
                          <MdDelete className="h-3.5 w-3.5" />
                        </button>
                        <Icone className="h-6 w-6 shrink-0 text-current" />
                        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-0.5 px-1">
                          <span className="line-clamp-3 w-full text-center text-[11px] font-medium leading-tight">
                            {meio?.getNome() || 'Meio de pagamento'}
                          </span>
                          <span className="w-full shrink-0 truncate text-center text-xs font-semibold leading-tight">
                            {transformarParaReal(pagamento.valor)}
                          </span>
                          <span className="w-full truncate text-center text-[10px] font-medium leading-tight opacity-80">
                            {pagamento.cobrarNaEntrega || pagamento.naoEfetivo
                              ? 'Na entrega'
                              : 'Já pago'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </PedidoPagamentoStep>
  )
}
