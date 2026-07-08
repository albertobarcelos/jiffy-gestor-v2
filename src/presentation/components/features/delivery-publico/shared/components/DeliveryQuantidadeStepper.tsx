'use client'

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
}: DeliveryQuantidadeStepperProps) {
  const btnSize = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9'
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-4 w-4'
  const valueMinWidth = size === 'sm' ? 'min-w-[1.75rem]' : 'min-w-[2rem]'

  return (
    <div
      className="flex items-center overflow-hidden rounded-lg border"
      style={{ borderColor: 'var(--delivery-border)' }}
    >
      <button
        type="button"
        onClick={onDecrease}
        disabled={disabledDecrease ?? value <= min}
        aria-label={decreaseLabel}
        className={`flex ${btnSize} items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-40`}
        style={{
          backgroundColor: 'var(--delivery-primary-dark)',
          color: 'var(--delivery-btn-text)',
        }}
      >
        <MdRemove className={iconSize} />
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
