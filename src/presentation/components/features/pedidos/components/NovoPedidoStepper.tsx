'use client'

import { MdCheckCircle } from 'react-icons/md'

interface NovoPedidoStepperProps {
  currentStep: 1 | 2 | 3 | 4
  modoVisualizacao?: boolean
  tipoInicioPedido: 'balcao' | 'entrega'
}

function StepCircle({
  step,
  displayStep,
  currentStep,
}: {
  step: 1 | 2 | 3 | 4
  displayStep: number
  currentStep: 1 | 2 | 3 | 4
}) {
  const concluido = currentStep > step
  const ativo = currentStep >= step

  return (
    <div
      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
        ativo ? 'border-primary bg-primary text-white' : 'border-gray-300 bg-white text-gray-400'
      }`}
    >
      {concluido ? (
        <MdCheckCircle className="h-5 w-5" />
      ) : (
        <span className="text-sm font-semibold">{displayStep}</span>
      )}
    </div>
  )
}

function StepItem({
  step,
  displayStep,
  label,
  currentStep,
}: {
  step: 1 | 2 | 3 | 4
  displayStep: number
  label: string
  currentStep: 1 | 2 | 3 | 4
}) {
  return (
    <div className="flex items-center gap-2">
      <StepCircle step={step} displayStep={displayStep} currentStep={currentStep} />
      <span className={`text-sm font-medium ${currentStep >= step ? 'text-primary' : 'text-gray-400'}`}>
        {label}
      </span>
    </div>
  )
}

export function NovoPedidoStepper({
  currentStep,
  modoVisualizacao,
  tipoInicioPedido,
}: NovoPedidoStepperProps) {
  if (modoVisualizacao && currentStep === 4) return null

  const steps =
    tipoInicioPedido === 'entrega'
      ? [
          { step: 1 as const, label: 'Produtos' },
          { step: 2 as const, label: 'Informações' },
          { step: 3 as const, label: 'Pagamento' },
        ]
      : [
          { step: 1 as const, label: 'Produtos' },
          { step: 3 as const, label: 'Pagamento' },
        ]

  return (
    <div className="mt-3 mb-4 flex items-center justify-center gap-2">
      {steps.map((item, index) => (
        <div key={item.step} className="contents">
          {index > 0 ? (
            <div className={`h-0.5 w-12 ${currentStep >= item.step ? 'bg-primary' : 'bg-gray-300'}`} />
          ) : null}
          <StepItem
            step={item.step}
            displayStep={index + 1}
            label={item.label}
            currentStep={currentStep}
          />
        </div>
      ))}
    </div>
  )
}
