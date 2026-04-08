'use client'

import * as React from 'react'
import { cn } from '@/src/shared/utils/cn'

export interface JiffyIconSwitchProps {
  checked: boolean
  onChange: React.ChangeEventHandler<HTMLInputElement>
  disabled?: boolean
  /** Texto ou nó ao lado do trilho; se omitido, use `inputProps['aria-label']` */
  label?: React.ReactNode
  /** `start`: label antes do trilho (padrão); `end`: depois */
  labelPosition?: 'start' | 'end'
  id?: string
  name?: string
  /** Classes no `<label>` (ex.: `justify-end`, `w-full`) */
  className?: string
  /** Borda primary em volta da linha inteira (label + switch), como no modal de complemento */
  bordered?: boolean
  /** Atributos extras no `<input type="checkbox">` (exceto type/className/checked/onChange/disabled) */
  inputProps?: Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'type' | 'className' | 'checked' | 'onChange' | 'disabled'
  >
}

/**
 * Switch em formato “pill”: ✓ no trilho quando ligado, ✕ quando desligado.
 * Reutilizável em cadastros e listas (mesmo padrão visual do complemento).
 */
export function JiffyIconSwitch({
  checked,
  onChange,
  disabled = false,
  label,
  labelPosition = 'start',
  id,
  name,
  className,
  bordered = false,
  inputProps,
}: JiffyIconSwitchProps) {
  const generatedId = React.useId()
  const inputId = id ?? generatedId

  const hasLabel = label != null && label !== ''
  const labelEl = hasLabel ? (
    <span className="text-primary-text font-medium select-none">{label}</span>
  ) : null

  const track = (
    <div
      className={cn(
        'relative h-6 w-12 shrink-0 rounded-full transition-colors duration-200',
        checked ? 'bg-[var(--color-accent1)]' : 'bg-error',
        disabled && 'opacity-60'
      )}
      aria-hidden
    >
      <span
        className={cn(
          'pointer-events-none absolute left-[7px] top-1/2 -translate-y-1/2 text-[11px] font-semibold leading-none text-white transition-opacity duration-200',
          checked ? 'opacity-100' : 'opacity-0'
        )}
      >
        ✓
      </span>
      <span
        className={cn(
          // text-white sempre — se só opacity-0 no “ligado”, herda cor escura do label e o ✕ pisca preto ao desligar
          'pointer-events-none absolute right-[7px] top-1/2 -translate-y-1/2 text-[11px] font-semibold leading-none text-white transition-opacity duration-200',
          checked ? 'opacity-0' : 'opacity-100'
        )}
      >
        ✕
      </span>
      {/* Thumb branco + anel interno com borda na cor do estado (igual ao trilho) */}
      <span
        className={cn(
          'pointer-events-none absolute top-[3px] left-[3px] flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-200 ease-out',
          checked ? 'translate-x-[22px]' : 'translate-x-0'
        )}
      >
        <span
          className={cn(
            'h-[13px] w-[13px] shrink-0 rounded-full border border-solid bg-white transition-colors duration-200',
            checked ? 'border-[var(--color-accent1)]' : 'border-[var(--color-error)]'
          )}
          aria-hidden
        />
      </span>
    </div>
  )

  return (
    <label
      className={cn(
        'flex items-center gap-3 rounded-lg px-4 py-1 outline-none',
        // Anel só com foco por teclado — evita o “quadrado” primary ao clicar com o mouse
        'has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-[var(--color-primary)] has-[input:focus-visible]:ring-offset-2',
        bordered && 'border border-[var(--color-primary)]',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        className
      )}
    >
      {labelPosition === 'start' ? labelEl : null}
      <input
        id={inputId}
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="sr-only"
        {...inputProps}
      />
      {labelPosition === 'end' ? (
        <>
          {track}
          {labelEl}
        </>
      ) : (
        track
      )}
    </label>
  )
}
