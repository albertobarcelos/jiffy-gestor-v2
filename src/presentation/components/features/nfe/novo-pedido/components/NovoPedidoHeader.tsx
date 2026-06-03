'use client'

import { MdPerson } from 'react-icons/md'
import type { AbaDetalhesPedido } from '../types'
import { PedidoDetalhesTabs } from './PedidoDetalhesTabs'

interface NovoPedidoHeaderProps {
  modoVisualizacao?: boolean
  nomeUsuario: string
  currentStep: 1 | 2 | 3 | 4
  isLoadingVenda: boolean
  abaDetalhesPedido: AbaDetalhesPedido
  onAbaDetalhesPedidoChange: (aba: AbaDetalhesPedido) => void
  podeExibirAbaNotaFiscal: boolean
  podeExibirAbaDadosEntrega: boolean
}

export function NovoPedidoHeader({
  modoVisualizacao,
  nomeUsuario,
  currentStep,
  isLoadingVenda,
  abaDetalhesPedido,
  onAbaDetalhesPedidoChange,
  podeExibirAbaNotaFiscal,
  podeExibirAbaDadosEntrega,
}: NovoPedidoHeaderProps) {
  const deveMostrarAbas = currentStep === 4 && !isLoadingVenda

  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {modoVisualizacao ? 'Detalhes do Pedido' : 'Novo Pedido'}
        </h1>
        {nomeUsuario && (
          <div className="flex items-center gap-2">
            <MdPerson className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-gray-600">
              Usuário: <span className="font-semibold text-primary">{nomeUsuario}</span>
            </span>
          </div>
        )}
      </div>

      {deveMostrarAbas && (
        <PedidoDetalhesTabs
          abaSelecionada={abaDetalhesPedido}
          onAbaChange={onAbaDetalhesPedidoChange}
          podeExibirAbaNotaFiscal={podeExibirAbaNotaFiscal}
          podeExibirAbaDadosEntrega={podeExibirAbaDadosEntrega}
        />
      )}
    </div>
  )
}
