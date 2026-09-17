'use client'

import { DeliveryButton } from '../../../shared/components/DeliveryButton'
import { DeliveryQuantidadeStepper } from '../../../shared/components/DeliveryQuantidadeStepper'
import { formatDeliveryCurrency } from '../../../shared/utils/formatDeliveryCurrency'

type DeliveryProdutoFooterProps = {
  quantidade: number
  onQuantidadeChange: (value: number) => void
  valorTotal: number
  salvando: boolean
  isEdicao: boolean
  disabledSalvar: boolean
  onSalvar: () => void
}

export function DeliveryProdutoFooter({
  quantidade,
  onQuantidadeChange,
  valorTotal,
  salvando,
  isEdicao,
  disabledSalvar,
  onSalvar,
}: DeliveryProdutoFooterProps) {
  return (
    <div
      className="flex shrink-0 items-center gap-3 border-t px-4 py-3"
      style={{
        borderColor: 'var(--delivery-border)',
        backgroundColor: 'var(--delivery-surface)',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
      }}
    >
      <DeliveryQuantidadeStepper
        value={quantidade}
        min={1}
        decreaseLabel="Diminuir quantidade do produto"
        increaseLabel="Aumentar quantidade do produto"
        onDecrease={() => onQuantidadeChange(Math.max(1, quantidade - 1))}
        onIncrease={() => onQuantidadeChange(quantidade + 1)}
      />
      <DeliveryButton
        className="min-h-[48px] flex-1"
        disabled={disabledSalvar}
        onClick={onSalvar}
        style={{
          backgroundColor: 'var(--delivery-primary-dark)',
          color: 'var(--delivery-btn-text, #ffffff)',
        }}
      >
        {salvando
          ? isEdicao
            ? 'Salvando...'
            : 'Adicionando...'
          : `${isEdicao ? 'Atualizar' : 'Adicionar'}  ${formatDeliveryCurrency(valorTotal)}`}
      </DeliveryButton>
    </div>
  )
}
