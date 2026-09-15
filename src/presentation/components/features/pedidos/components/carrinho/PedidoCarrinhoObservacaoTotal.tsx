'use client'

import { MdEdit, MdRemove } from 'react-icons/md'
import { Textarea } from '@/src/presentation/components/ui/textarea'
import {
  OBSERVACAO_PEDIDO_MAX_CHARS,
  observacaoTextoParcialInvalido,
} from '@/src/shared/helpers/observacaoPedido'
import { transformarParaReal } from '@/src/shared/utils/formatters'

type PedidoCarrinhoObservacaoTotalProps = {
  temProdutos: boolean
  observacaoPedido: string
  observacaoPedidoVisivel: boolean
  totalProdutos: number
  onObservacaoChange: (valor: string) => void
  onToggleObservacao: () => void
}

export function PedidoCarrinhoObservacaoTotal({
  temProdutos,
  observacaoPedido,
  observacaoPedidoVisivel,
  totalProdutos,
  onObservacaoChange,
  onToggleObservacao,
}: PedidoCarrinhoObservacaoTotalProps) {
  return (
    <div className="flex shrink-0 flex-col gap-2 border-t border-gray-200 bg-white">
      {temProdutos && observacaoPedidoVisivel ? (
        <div className="px-2 pt-2">
          <Textarea
            label="Observação do pedido"
            placeholder="Instruções gerais para o pedido (opcional)"
            value={observacaoPedido}
            onChange={e => onObservacaoChange(e.target.value)}
            inputProps={{ maxLength: OBSERVACAO_PEDIDO_MAX_CHARS }}
            error={observacaoTextoParcialInvalido(observacaoPedido)}
            helperText={
              observacaoTextoParcialInvalido(observacaoPedido)
                ? 'Mínimo 3 caracteres (ou deixe vazio).'
                : `${observacaoPedido.length}/${OBSERVACAO_PEDIDO_MAX_CHARS} caracteres`
            }
            rows={2}
          />
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-2 px-2 py-2">
        {temProdutos && (!observacaoPedidoVisivel || !observacaoPedido.trim()) && (
          <button
            type="button"
            aria-label={
              observacaoPedidoVisivel
                ? 'Ocultar observação do pedido'
                : 'Adicionar observação ao pedido'
            }
            onClick={onToggleObservacao}
            className="flex h-7 max-w-full items-center gap-1.5 rounded border border-gray-300 bg-white px-2 text-gray-600 transition-colors hover:border-primary hover:text-primary"
          >
            {observacaoPedidoVisivel ? (
              <MdRemove className="h-4 w-4 shrink-0" />
            ) : (
              <MdEdit className="h-4 w-4 shrink-0" />
            )}
            <span className="truncate text-xs font-medium">
              {observacaoPedidoVisivel ? 'Ocultar recado' : 'Deixar um recado no pedido'}
            </span>
          </button>
        )}
        <div className="flex items-center justify-end gap-2 px-2 py-2">
          <span className="text-sm font-semibold text-gray-700">Total do Pedido:</span>
          <span className="text-lg font-semibold text-primary">
            {transformarParaReal(totalProdutos)}
          </span>
        </div>
      </div>
    </div>
  )
}
