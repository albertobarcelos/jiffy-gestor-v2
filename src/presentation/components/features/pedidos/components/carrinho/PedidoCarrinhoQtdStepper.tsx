'use client'

import type {
  ChangeEvent,
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
} from 'react'
import { MdAdd, MdRemove } from 'react-icons/md'
import { STEPPER_BTN_CLASS } from './pedidoCarrinhoLayout'

type PedidoCarrinhoQtdStepperProps = {
  value: string
  inputMode: 'decimal' | 'numeric'
  inputClassName: string
  ariaLabelQuantidade: string
  ariaLabelMenos: string
  ariaLabelMais: string
  readOnly?: boolean
  menosDisabled?: boolean
  maisDisabled?: boolean
  onMenos: (e: MouseEvent<HTMLButtonElement>) => void
  onMais: (e: MouseEvent<HTMLButtonElement>) => void
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  onFocus: (e: FocusEvent<HTMLInputElement>) => void
  onBlur: (e: FocusEvent<HTMLInputElement>) => void
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
}

export function PedidoCarrinhoQtdStepper({
  value,
  inputMode,
  inputClassName,
  ariaLabelQuantidade,
  ariaLabelMenos,
  ariaLabelMais,
  readOnly,
  menosDisabled,
  maisDisabled,
  onMenos,
  onMais,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
}: PedidoCarrinhoQtdStepperProps) {
  return (
    <div className="flex items-center justify-center">
      <div className="inline-flex items-center rounded-full border border-gray-200 bg-white p-0.5">
        <button
          type="button"
          aria-label={ariaLabelMenos}
          disabled={menosDisabled}
          onClick={onMenos}
          className={STEPPER_BTN_CLASS}
        >
          <MdRemove className="h-3.5 w-3.5" />
        </button>
        <input
          type="text"
          inputMode={inputMode}
          aria-label={ariaLabelQuantidade}
          readOnly={readOnly}
          value={value}
          onClick={e => e.stopPropagation()}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          className={inputClassName}
        />
        <button
          type="button"
          aria-label={ariaLabelMais}
          disabled={maisDisabled}
          onClick={onMais}
          className={STEPPER_BTN_CLASS}
        >
          <MdAdd className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
