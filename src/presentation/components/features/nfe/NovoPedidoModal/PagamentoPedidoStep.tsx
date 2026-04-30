'use client'

import type React from 'react'
import { Label } from '@/src/presentation/components/ui/label'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { MeioPagamento } from '@/src/domain/entities/MeioPagamento'
import { MdCreditCard, MdDelete } from 'react-icons/md'
import type { PagamentoSelecionado, ProdutoSelecionado, StatusVenda } from './novoPedidoModal.types'

export interface PagamentoPedidoStatusOption {
  value: StatusVenda | string
  label: string
}

export interface PagamentoPedidoStepProps {
  status: StatusVenda
  clienteNome: string
  origem: string
  statusDisponiveis: PagamentoPedidoStatusOption[]
  produtos: ProdutoSelecionado[]
  totalProdutos: number
  valorAPagar: number
  valorRecebido: string
  setValorRecebido: React.Dispatch<React.SetStateAction<string>>
  formatarValorRecebido: (valor: string) => string
  meiosPagamentoScrollRef: React.RefObject<HTMLDivElement | null>
  mostrarLoadingFormasPagamento: boolean
  handleMouseDownMeiosPagamento: React.MouseEventHandler<HTMLDivElement> | undefined
  hasMovedMeiosPagamentoRef: React.MutableRefObject<boolean>
  isDraggingMeiosPagamento: boolean
  meiosPagamento: MeioPagamento[]
  obterIconeMeioPagamento: (nome: string) => React.ComponentType<{ className?: string }>
  adicionarPagamentoPorCard: (meioPagamentoId: string) => void
  totalPagamentos: number
  troco: number
  pagamentos: PagamentoSelecionado[]
  removerPagamento: (index: number) => void
  transformarParaReal: (valor: number) => string
}

/**
 * Passo 3: resumo do pedido e fluxo de pagamento (formas, valor recebido, troco).
 */
export function PagamentoPedidoStep({
  status,
  clienteNome,
  origem,
  statusDisponiveis,
  produtos,
  totalProdutos,
  valorAPagar,
  valorRecebido,
  setValorRecebido,
  formatarValorRecebido,
  meiosPagamentoScrollRef,
  mostrarLoadingFormasPagamento,
  handleMouseDownMeiosPagamento,
  hasMovedMeiosPagamentoRef,
  isDraggingMeiosPagamento,
  meiosPagamento,
  obterIconeMeioPagamento,
  adicionarPagamentoPorCard,
  totalPagamentos,
  troco,
  pagamentos,
  removerPagamento,
  transformarParaReal,
}: PagamentoPedidoStepProps) {
  return (
    <div className="space-y-2">
      <div className="rounded-lg border bg-gray-50 px-4">
        <h3 className="text-lg font-semibold">Informações do Pedido</h3>
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
            <span className="font-medium">
              {statusDisponiveis.find(s => s.value === status)?.label}
            </span>
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
              {produtos.length} {produtos.length === 1 ? 'produto' : 'produtos'}
            </span>
          </div>
        </div>
      </div>

      {(status === 'FINALIZADA' || status === 'PENDENTE_EMISSAO') && (
        <div className="space-y-4">
          <div className="rounded-lg border bg-white px-4">
            <h3 className="text-lg font-semibold">Pagamento</h3>

            <div className="mb-2 space-y-2 text-sm">
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
              <div className="flex items-center gap-2">
                <span className="font-medium text-primary-text">Valor Recebido:</span>
                <input
                  type="text"
                  value={valorRecebido}
                  onChange={e => {
                    const valorFormatado = formatarValorRecebido(e.target.value)
                    setValorRecebido(valorFormatado)
                  }}
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
                        onMouseDown={() => {
                          /* propaga arraste no container */
                        }}
                        disabled={valorAPagar <= 0}
                        className={`flex min-w-[100px] flex-shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-primary bg-white p-2 transition-all hover:bg-primary hover:text-white ${valorAPagar <= 0 ? 'cursor-not-allowed opacity-50' : ''} `}
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
                <span className="font-semibold text-gray-700">Total Pago:</span>
                <span className="text-base font-semibold text-gray-900">
                  {transformarParaReal(totalPagamentos)}
                </span>
              </div>
              {troco > 0 && (
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700">Troco:</span>
                  <span className="text-base font-semibold text-green-600">
                    {transformarParaReal(troco)}
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
    </div>
  )
}
