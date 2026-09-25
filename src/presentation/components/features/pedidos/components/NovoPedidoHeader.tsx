'use client'

import { MdPerson } from 'react-icons/md'
import type { AbaDetalhesPedido } from '../types'
import { NOVO_PEDIDO_SHELL_PADDING_X_CLASS } from '../layout/novoPedidoShellLayout'
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
  bloquearAbasDetalhe?: boolean
  podeExibirAbaNotaFiscal: boolean
  podeExibirAbaDadosEntrega: boolean
  tipoInicioPedido: 'balcao' | 'delivery'
}

export function NovoPedidoHeader({
  modoVisualizacao,
  modoEdicaoProdutos,
  nomeUsuario,
  currentStep,
  isLoadingVenda,
  abaDetalhesPedido,
  onAbaDetalhesPedidoChange,
  bloquearAbasDetalhe = false,
  podeExibirAbaNotaFiscal,
  podeExibirAbaDadosEntrega,
  tipoInicioPedido,
}: NovoPedidoHeaderProps) {
  const deveMostrarAbas = currentStep === 4 && !isLoadingVenda

  const titulo = modoEdicaoProdutos
    ? 'Editar Pedido'
    : modoVisualizacao
      ? 'Detalhes do Pedido'
      : 'Novo Pedido'

  const mostrarStepper = !modoEdicaoProdutos && !(modoVisualizacao && currentStep === 4)

  return (
    <div className={`${NOVO_PEDIDO_SHELL_PADDING_X_CLASS} py-2`}>
      <div className="flex min-w-0 items-center justify-between gap-4">
        <h1 className="shrink-0 text-2xl font-semibold">{titulo}</h1>
        {nomeUsuario ? (
          <div className="flex shrink-0 items-center justify-end gap-1.5 text-sm">
            <MdPerson className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span className="whitespace-nowrap font-semibold text-primary">{nomeUsuario}</span>
          </div>
        ) : null}
      </div>

      {mostrarStepper ? (
        <div className="mt-1.5 flex justify-center">
          <NovoPedidoStepper
            currentStep={currentStep}
            modoVisualizacao={modoVisualizacao}
            tipoInicioPedido={tipoInicioPedido}
          />
        </div>
      ) : null}

      {deveMostrarAbas && (
        <PedidoDetalhesTabs
          abaSelecionada={abaDetalhesPedido}
          onAbaChange={onAbaDetalhesPedidoChange}
          podeExibirAbaNotaFiscal={podeExibirAbaNotaFiscal}
          podeExibirAbaDadosEntrega={podeExibirAbaDadosEntrega}
          bloquearAbasExcetoPagamentos={bloquearAbasDetalhe}
        />
      )}
    </div>
  )
}
