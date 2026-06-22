import type { VendaUnificadaDTO } from '../hooks/useVendasUnificadas'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { LABEL_SEM_CLIENTE } from '../rules/fiscalFlowKanban.rules'

/** Preview do card durante o arraste (DragOverlay): leve inclinação via classe global `.drag-preview-card`. */
export function VendaCardDragPreview({ venda }: { venda: VendaUnificadaDTO }) {
  const valorFormatado = transformarParaReal(venda.valorFinal)
  const clienteNome = venda.cliente?.nome?.trim() ? venda.cliente.nome : LABEL_SEM_CLIENTE

  return (
    <div className="drag-preview-card w-64 cursor-grabbing rounded-lg border-2 border-gray-300 bg-white p-2.5 opacity-95 shadow-lg">
      <p className="mb-0.5 text-xs text-gray-500">
        Venda {venda.numeroVenda}
        {venda.codigoVenda ? ` - #${venda.codigoVenda}` : ''}
      </p>
      <p className="mb-0.5 truncate text-sm font-semibold uppercase text-primary">{clienteNome}</p>
      <div className="mb-1.5 border-b border-gray-200 pb-1.5">
        <p className="text-xs text-gray-600">
          <span className="text-sm font-semibold text-gray-900">{valorFormatado}</span>
        </p>
      </div>
      {venda.origem && <p className="text-xs text-gray-500">Origem: {venda.origem}</p>}
    </div>
  )
}
