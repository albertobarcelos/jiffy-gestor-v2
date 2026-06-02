'use client'

import { Button } from '@/src/presentation/components/ui/button'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { Label } from '@/src/presentation/components/ui/label'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { MdCreditCard, MdDelete, MdPersonOutline } from 'react-icons/md'
import { PedidoPagamentoStep } from '../../PedidoPagamentoStep'
import { useNovoPedidoFormContext } from '../../../context/NovoPedidoFormContext'
import { useNovoPedidoUIContext } from '../../../context/NovoPedidoUIContext'
import { useNovoPedidoDetalheContext } from '../../../context/NovoPedidoDetalheContext'

export function PedidoPagamentoStepView() {
  const { tipoInicioPedido } = useNovoPedidoDetalheContext()
  const { setSeletorClienteOpen, handleMouseDownMeiosPagamento, hasMovedMeiosPagamentoRef, isDraggingMeiosPagamento, meiosPagamentoScrollRef } =
    useNovoPedidoUIContext()
  const {
    adicionarPagamentoPorCard,
    clienteEntregaVinculado,
    clienteNome,
    formatarValorRecebido,
    fluxoPagamentoEntrega,
    meiosPagamento,
    mostrarLoadingFormasPagamento,
    obterIconeMeioPagamento,
    origem,
    pagamentos,
    pedidoEntregaAceitaPagamentoPendente,
    pedidoGestorComPagamentoNoPasso3,
    removerPagamento,
    rotuloCobrancaPendente,
    rotuloStatusPagamentoExibicao,
    rotuloStatusResumoModal,
    setFluxoPagamentoEntrega,
    setPagamentos,
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
  } = useNovoPedidoFormContext()

  const nomeClienteResumo =
    tipoInicioPedido === 'entrega' ? (clienteEntregaVinculado?.nome ?? '') : clienteNome
  const rotuloAcaoClienteBalcao = nomeClienteResumo?.trim() ? 'Editar cliente' : 'Vincular Cliente'
  const restanteALancarExibicao = pedidoEntregaAceitaPagamentoPendente
    ? valorAPagarLancamento
    : valorAPagar
  const rotuloCampoValorRecebido =
    pedidoEntregaAceitaPagamentoPendente && fluxoPagamentoEntrega === 'cobrar_entregador'
      ? 'Valor a receber:'
      : 'Valor Recebido:'

  return (
    <PedidoPagamentoStep>
      <div className="rounded-lg border bg-gray-50 px-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Informações do Pedido</h3>
          {tipoInicioPedido !== 'entrega' && (
            <Button
              type="button"
              variant="contained"
              size="sm"
              onClick={() => setSeletorClienteOpen(true)}
              title={rotuloAcaoClienteBalcao}
              aria-label={rotuloAcaoClienteBalcao}
              className="flex h-8 min-h-8 w-8 min-w-8 shrink-0 items-center justify-center p-0"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                minWidth: 32,
                minHeight: 32,
                padding: 0,
                lineHeight: 0,
                backgroundColor: 'var(--color-primary)',
                borderColor: 'var(--color-primary)',
                color: '#fff',
                boxShadow: 'none',
                '& svg': { width: 20, height: 20, color: '#fff', fill: 'currentColor' },
                '&:hover': {
                  backgroundColor: 'var(--color-primary)',
                  borderColor: 'var(--color-primary)',
                  boxShadow: 'none',
                  opacity: 0.9,
                },
              }}
            >
              <MdPersonOutline aria-hidden />
            </Button>
          )}
        </div>
        <div className="text-sm">
          <div className="flex justify-between rounded-lg bg-white px-1">
            <span className="text-gray-600">Data:</span>
            <span className="font-medium">
              {new Date().toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <div className="flex justify-between px-1">
            <span className="text-gray-600">Origem:</span>
            <span className="font-medium">{origem}</span>
          </div>
          <div className="flex justify-between rounded-lg bg-white px-1">
            <span className="text-gray-600">Status:</span>
            <span className="font-medium">{rotuloStatusResumoModal}</span>
          </div>
          {nomeClienteResumo && (
            <div className="flex justify-between px-1">
              <span className="text-gray-600">Cliente:</span>
              <span className="font-medium">{nomeClienteResumo}</span>
            </div>
          )}
          <div className="flex justify-between rounded-lg bg-white px-1">
            <span className="text-gray-600">Total de Itens:</span>
            <span className="font-medium">
              {totalItensPedido} {totalItensPedido === 1 ? 'produto' : 'produtos'}
            </span>
          </div>
          {pedidoEntregaAceitaPagamentoPendente && valorTaxaEntrega > 0 && (
            <div className="flex justify-between rounded-lg bg-white px-1">
              <span className="text-gray-600">Taxa de entrega:</span>
              <span className="font-medium text-primary">
                + {transformarParaReal(valorTaxaEntrega)}
              </span>
            </div>
          )}
        </div>
      </div>

      {pedidoGestorComPagamentoNoPasso3 && (
        <div className="space-y-4">
          <div className="rounded-lg border bg-white px-4">
            <h3 className="text-lg font-semibold">Pagamento</h3>
            <div className="mb-2 space-y-2 text-sm">
              {pedidoEntregaAceitaPagamentoPendente && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFluxoPagamentoEntrega('cobrar_entregador')
                      setPagamentos(prev =>
                        prev.map(pagamento => ({ ...pagamento, cobrarNaEntrega: true }))
                      )
                    }}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                      fluxoPagamentoEntrega === 'cobrar_entregador'
                        ? 'border-primary bg-primary text-white'
                        : 'border-gray-200 bg-white text-primary-text'
                    }`}
                  >
                    {rotuloCobrancaPendente}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFluxoPagamentoEntrega('ja_pago')
                      setPagamentos(prev =>
                        prev.map(pagamento => ({ ...pagamento, cobrarNaEntrega: false }))
                      )
                    }}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                      fluxoPagamentoEntrega === 'ja_pago'
                        ? 'border-primary bg-primary text-white'
                        : 'border-gray-200 bg-white text-primary-text'
                    }`}
                  >
                    Já foi pago
                  </button>
                </div>
              )}
              {pedidoEntregaAceitaPagamentoPendente && valorTaxaEntrega > 0 && (
                <>
                  <div className="flex items-center justify-between rounded-lg bg-gray-100 p-1">
                    <span className="font-medium text-gray-700">Produtos:</span>
                    <span className="text-base font-semibold text-gray-900">
                      {transformarParaReal(subtotalProdutos)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-gray-100 p-1">
                    <span className="font-medium text-gray-700">Taxa de entrega:</span>
                    <span className="text-base font-semibold text-gray-900">
                      + {transformarParaReal(valorTaxaEntrega)}
                    </span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between rounded-lg bg-gray-100 p-1">
                <span className="font-medium text-gray-700">Total do Pedido:</span>
                <span className="text-base font-semibold text-primary">
                  {transformarParaReal(totalProdutos)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-gray-100 p-1">
                <span className="font-medium text-gray-700">A pagar:</span>
                <span
                  className={`text-base font-semibold ${
                    valorAPagar > 0 ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {transformarParaReal(valorAPagar)}
                </span>
              </div>
              {pedidoEntregaAceitaPagamentoPendente && (
                <div className="flex items-center justify-between rounded-lg bg-gray-100 p-1">
                  <span className="font-medium text-gray-700">Status pagamento:</span>
                  <span
                    className={`text-base font-semibold ${
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
                        className={`flex min-w-[100px] flex-shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-primary bg-white p-2 transition-all hover:bg-primary hover:text-white ${valorAPagarLancamento <= 0 && !valorRecebido.trim() ? 'cursor-not-allowed opacity-50' : ''}`}
                      >
                        <Icone className="h-8 w-8" />
                        <span className="text-center text-xs font-medium">{meio.getNome()}</span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            <div className="border-t pt-2 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-gray-100 p-1">
                <span className="font-semibold text-gray-700">
                  Total Recebido{tipoInicioPedido === 'entrega' ? ' (Efetivo)' : ''}:
                </span>
                <span className="text-base font-semibold text-green-700">
                  {transformarParaReal(totalPagamentos)}
                </span>
              </div>
              {pedidoEntregaAceitaPagamentoPendente &&
                totalPagamentosLancados - totalPagamentos > 0 && (
                  <div className="mt-1 flex items-center justify-between rounded-lg bg-amber-50 p-1">
                    <span className="font-semibold text-gray-700">A receber na entrega:</span>
                    <span className="text-base font-semibold text-amber-700">
                      {transformarParaReal(totalPagamentosLancados - totalPagamentos)}
                    </span>
                  </div>
                )}
              {trocoLancamento > 0 && (
                <div className="mt-1 flex items-center justify-between rounded-lg bg-gray-50 p-1">
                  <span className="font-semibold text-gray-700">Troco previsto:</span>
                  <span className="text-base font-semibold text-green-600">
                    {transformarParaReal(trocoLancamento)}
                  </span>
                </div>
              )}
              {pedidoEntregaAceitaPagamentoPendente && restanteALancarExibicao > 0 && (
                <div className="mt-1 flex items-center justify-between rounded-lg bg-red-50 p-1">
                  <span className="font-semibold text-gray-700">Restante a lançar:</span>
                  <span className="text-base font-semibold text-red-600">
                    {transformarParaReal(restanteALancarExibicao)}
                  </span>
                </div>
              )}
            </div>

            {pagamentos.length > 0 && (
              <div className="mt-2 border-t pt-2">
                <Label className="mb-2 block text-sm font-semibold">Detalhes:</Label>
                <div className="flex flex-wrap gap-2">
                  {pagamentos.map((pagamento, index) => {
                    const meio = meiosPagamento.find(m => m.getId() === pagamento.meioPagamentoId)
                    const Icone = meio ? obterIconeMeioPagamento(meio.getNome()) : MdCreditCard
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-100 p-2"
                      >
                        <Icone className="h-6 w-6 text-green-700" />
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-green-900">
                            {meio?.getNome() || 'Meio de pagamento'}
                          </span>
                          <span className="text-xs font-semibold text-green-900">
                            {transformarParaReal(pagamento.valor)}
                          </span>
                        </div>
                        <button
                          onClick={() => removerPagamento(index)}
                          type="button"
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-green-100 p-0 hover:bg-green-200"
                        >
                          <MdDelete className="h-4 w-4 text-green-700" />
                        </button>
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
