'use client'

import { Trash2 } from 'lucide-react'
import { MdAdd, MdRemove } from 'react-icons/md'

type DeliveryQuantidadeStepperProps = {
  value: number
  min?: number
  onDecrease: () => void
  onIncrease: () => void
  decreaseLabel: string
  increaseLabel: string
  size?: 'sm' | 'md'
  disabledDecrease?: boolean
  /**
   * Quando `value === min`, troca o ícone de − pela lixeira e mantém o botão ativo
   * (ex.: remover item do carrinho).
   */
  removeAtMin?: boolean
  removeLabel?: string
}

export function DeliveryQuantidadeStepper({
  value,
  min = 0,
  onDecrease,
  onIncrease,
  decreaseLabel,
  increaseLabel,
  size = 'md',
  disabledDecrease,
  removeAtMin = false,
  removeLabel = 'Remover item',
}: DeliveryQuantidadeStepperProps) {
  const btnSize = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9'
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-4 w-4'
  const valueMinWidth = size === 'sm' ? 'min-w-[1.75rem]' : 'min-w-[2rem]'
  const showRemove = removeAtMin && value <= min
  const decreaseDisabled = showRemove
    ? false
    : (disabledDecrease ?? value <= min)

  return (
    <div
      className="flex items-center overflow-hidden rounded-lg border"
      style={{ borderColor: 'var(--delivery-border)' }}
    >
      <button
        type="button"
        onClick={onDecrease}
        disabled={decreaseDisabled}
        aria-label={showRemove ? removeLabel : decreaseLabel}
        className={`flex ${btnSize} items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-40`}
        style={
          showRemove
            ? {
                backgroundColor: 'transparent',
                color: '#ef4444',
              }
            : {
                backgroundColor: 'var(--delivery-primary-dark)',
                color: 'var(--delivery-btn-text)',
              }
        }
      >
        {showRemove ? (
          <Trash2 className={iconSize} strokeWidth={2} aria-hidden />
        ) : (
          <MdRemove className={iconSize} />
        )}
      </button>
      <span
        className={`${valueMinWidth} bg-white px-2 text-center text-sm font-bold tabular-nums`}
        style={{ color: 'var(--delivery-text)' }}
        aria-label="Quantidade"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={onIncrease}
        aria-label={increaseLabel}
        className={`flex ${btnSize} items-center justify-center transition-colors`}
        style={{
          backgroundColor: 'var(--delivery-primary-dark)',
          color: 'var(--delivery-btn-text)',
        }}
      >
        <MdAdd className={iconSize} />
      </button>
    </div>
  )
}
