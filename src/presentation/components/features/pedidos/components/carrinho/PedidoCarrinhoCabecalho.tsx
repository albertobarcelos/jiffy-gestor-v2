'use client'

import { CARRINHO_PRODUTOS_GRID_CLASS } from './pedidoCarrinhoLayout'

export function PedidoCarrinhoCabecalho() {
  return (
    <div className={`mb-2 border-b border-gray-300 pb-2 ${CARRINHO_PRODUTOS_GRID_CLASS}`}>
      <div className="flex items-center justify-center">
        <span className="text-center text-xs font-semibold text-gray-700">Qtd</span>
      </div>
      <div className="min-w-0">
        <span className="text-xs font-semibold text-gray-700">Produto</span>
      </div>
      <div>
        <span className="block text-center text-xs font-semibold text-gray-700">Unid.</span>
      </div>
      <div>
        <span className="block text-right text-xs font-semibold text-gray-700">
          Desc./Acres.
        </span>
      </div>
      <div>
        <span className="block text-right text-xs font-semibold text-gray-700 tabular-nums">
          Val Unit.
        </span>
      </div>
      <div>
        <span className="block whitespace-nowrap text-right text-xs font-semibold text-gray-700 tabular-nums">
          Total
        </span>
      </div>
      <div />
    </div>
  )
}
