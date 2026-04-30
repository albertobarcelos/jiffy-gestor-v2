'use client'

import { MdCheckCircle } from 'react-icons/md'

export interface NovoPedidoStepIndicatorProps {
  currentStep: 1 | 2 | 3 | 4
}

/**
 * Indicador horizontal dos 4 passos do novo pedido (Informações → Produtos → Pagamento → Detalhes).
 */
export function NovoPedidoStepIndicator({ currentStep }: NovoPedidoStepIndicatorProps) {
  return (
    <div className="mt-2 flex items-center justify-center gap-2">
      {/* Step 1 */}
      <div className="flex items-center gap-2">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
            currentStep >= 1
              ? 'border-primary bg-primary text-white'
              : 'border-gray-300 bg-white text-gray-400'
          }`}
        >
          {currentStep > 1 ? (
            <MdCheckCircle className="h-5 w-5" />
          ) : (
            <span className="text-sm font-semibold">1</span>
          )}
        </div>
        <span
          className={`text-sm font-medium ${currentStep >= 1 ? 'text-primary' : 'text-gray-400'}`}
        >
          Informações
        </span>
      </div>

      <div className={`h-0.5 w-12 ${currentStep >= 2 ? 'bg-primary' : 'bg-gray-300'}`} />

      {/* Step 2 */}
      <div className="flex items-center gap-2">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
            currentStep >= 2
              ? 'border-primary bg-primary text-white'
              : 'border-gray-300 bg-white text-gray-400'
          }`}
        >
          {currentStep > 2 ? (
            <MdCheckCircle className="h-5 w-5" />
          ) : (
            <span className="text-sm font-semibold">2</span>
          )}
        </div>
        <span
          className={`text-sm font-medium ${currentStep >= 2 ? 'text-primary' : 'text-gray-400'}`}
        >
          Produtos
        </span>
      </div>

      <div className={`h-0.5 w-12 ${currentStep >= 3 ? 'bg-primary' : 'bg-gray-300'}`} />

      {/* Step 3 */}
      <div className="flex items-center gap-2">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
            currentStep >= 3
              ? 'border-primary bg-primary text-white'
              : 'border-gray-300 bg-white text-gray-400'
          }`}
        >
          {currentStep > 3 ? (
            <MdCheckCircle className="h-5 w-5" />
          ) : (
            <span className="text-sm font-semibold">3</span>
          )}
        </div>
        <span
          className={`text-sm font-medium ${currentStep >= 3 ? 'text-primary' : 'text-gray-400'}`}
        >
          Pagamento
        </span>
      </div>

      <div className={`h-0.5 w-12 ${currentStep >= 4 ? 'bg-primary' : 'bg-gray-300'}`} />

      {/* Step 4 */}
      <div className="flex items-center gap-2">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
            currentStep >= 4
              ? 'border-primary bg-primary text-white'
              : 'border-gray-300 bg-white text-gray-400'
          }`}
        >
          <span className="text-sm font-semibold">4</span>
        </div>
        <span
          className={`text-sm font-medium ${currentStep >= 4 ? 'text-primary' : 'text-gray-400'}`}
        >
          Detalhes
        </span>
      </div>
    </div>
  )
}
