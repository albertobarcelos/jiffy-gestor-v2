'use client'

import { PedidoProdutosStep } from './PedidoProdutosStep'
import { PedidoProdutosStepLayout } from './PedidoProdutosStepLayout'
import { PedidoInformacoesStepView } from './steps/informacoes/PedidoInformacoesStepView'
import { PedidoPagamentoStepView } from './steps/pagamento/PedidoPagamentoStepView'
import { useNovoPedidoDetalheContext } from '../context/NovoPedidoContext'
import { useNovoPedidoUIContext } from '../context/NovoPedidoContext'

export function PedidoWizardStepsView() {
  const { modoVisualizacao, tipoInicioPedido } = useNovoPedidoDetalheContext()
  const { currentStep } = useNovoPedidoUIContext()

  return (
    <>
      {!modoVisualizacao && tipoInicioPedido === 'entrega' && currentStep === 2 && (
        <PedidoInformacoesStepView />
      )}

      {!modoVisualizacao && currentStep === 1 && (
        <PedidoProdutosStep>
          <PedidoProdutosStepLayout />
        </PedidoProdutosStep>
      )}

      {!modoVisualizacao && currentStep === 3 && <PedidoPagamentoStepView />}
    </>
  )
}
