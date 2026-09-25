'use client'

import { PedidoProdutosStep } from './PedidoProdutosStep'
import { PedidoProdutosStepLayout } from './PedidoProdutosStepLayout'
import { PedidoInformacoesStepView } from './steps/informacoes/PedidoInformacoesStepView'
import { PedidoPagamentoStepView } from './steps/pagamento/PedidoPagamentoStepView'
import { useNovoPedidoDetalheContext } from '../context/NovoPedidoContext'
import { useNovoPedidoUIContext } from '../context/NovoPedidoContext'

export function PedidoWizardStepsView() {
  const { modoVisualizacao, tipoInicioPedido, modoEdicaoProdutos } = useNovoPedidoDetalheContext()
  const { currentStep } = useNovoPedidoUIContext()
  const mostrarCatalogoProdutos =
    currentStep === 1 && (!modoVisualizacao || modoEdicaoProdutos)

  return (
    <>
      {!modoVisualizacao && tipoInicioPedido === 'delivery' && currentStep === 2 && (
        <PedidoInformacoesStepView />
      )}

      {mostrarCatalogoProdutos && (
        <PedidoProdutosStep>
          <PedidoProdutosStepLayout />
        </PedidoProdutosStep>
      )}

      {!modoVisualizacao && currentStep === 3 && <PedidoPagamentoStepView />}
    </>
  )
}
