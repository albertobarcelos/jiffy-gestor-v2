'use client'

import { MdPerson } from 'react-icons/md'
import type { AbaDetalhesPedido } from '../types'
import { PedidoDetalhesTabs } from './PedidoDetalhesTabs'
import { NovoPedidoStepper } from './NovoPedidoStepper'

interface NovoPedidoHeaderProps {
  modoVisualizacao?: boolean
  modoEdicaoProdutos?: boolean
  nomeUsuario: string
  currentStep: 1 | 2 | 3 | 4
  isLoadingVenda: boolean
  abaDetalhesPedido: AbaDetalhesPedido
  onAbaDetalhesPedidoChange: (aba: AbaDetalhesPedido) => void
  podeExibirAbaNotaFiscal: boolean
  podeExibirAbaDadosEntrega: boolean
  tipoInicioPedido: 'balcao' | 'entrega'
}

export function NovoPedidoHeader({
  modoVisualizacao,
  modoEdicaoProdutos,
  nomeUsuario,
  currentStep,
  isLoadingVenda,
  abaDetalhesPedido,
  onAbaDetalhesPedidoChange,
  podeExibirAbaNotaFiscal,
  podeExibirAbaDadosEntrega,
  tipoInicioPedido,
}: NovoPedidoHeaderProps) {
  const deveMostrarAbas = currentStep === 4 && !isLoadingVenda

  const titulo = modoEdicaoProdutos
    ? 'Editar produtos'
    : modoVisualizacao
      ? 'Detalhes do Pedido'
      : 'Novo Pedido'

  return (
    <div className="px-6 py-2">
      <div className="flex min-w-0 items-center gap-4">
        <h1 className="shrink-0 text-2xl font-semibold">{titulo}</h1>
        {!modoEdicaoProdutos ? (
          <div className="flex min-w-0 flex-1 justify-center">
            <NovoPedidoStepper
              currentStep={currentStep}
              modoVisualizacao={modoVisualizacao}
              tipoInicioPedido={tipoInicioPedido}
            />
          </div>
        ) : (
          <div className="min-w-0 flex-1" />
        )}
        {nomeUsuario ? (
          <div className="flex shrink-0 items-center justify-end gap-2">
            <MdPerson className="h-4 w-4 shrink-0 text-primary" />
            <span className="whitespace-nowrap text-right text-sm font-medium text-gray-600">
              Usuário: <span className="font-semibold text-primary">{nomeUsuario}</span>
            </span>
          </div>
        ) : null}
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
