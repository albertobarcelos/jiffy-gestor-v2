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
  /** Classes no controle (ex.: `justify-end`, `w-full`) */
  className?: string
  /** Borda primary em volta da linha inteira (label + switch), como no modal de complemento */
  bordered?: boolean
  /** `sm`: trilho menor; `xs`: ainda menor (listas densas); `default`: igual ao ref. (w-11 / thumb w-5) */
  size?: 'default' | 'sm' | 'xs'
  /** Atributos extras — repassados ao `<button>` (exceto type/className/checked/onChange/disabled) */
  inputProps?: Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'type' | 'className' | 'checked' | 'onChange' | 'disabled'
  >
}

/** Trilho / thumb / ícones — mesmo easing do efeito Galahhad (mais “elástico”). */
const EASING = 'cubic-bezier(0.27, 0.2, 0.25, 1.51)'
const TRANSITION = `all 0.3s ${EASING}`
/** Linha decorativa no trilho — ease-in-out como no original. */
const EFFECT_TRANSITION = 'all 0.3s ease-in-out'

const COLOR_TRACK_OFF = '#dc2626' /* red-600 */
const COLOR_TRACK_ON = '#16a34a' /* green-600 */
const COLOR_ICON_CHECK = '#16a34a'
const COLOR_ICON_CROSS = '#dc2626'

const SIZES = {
  /** Base: Tailwind w-11 × h-6, thumb w-5, ícone w-3 */
  default: { trackW: 44, trackH: 24, circleDia: 20, iconW: 12 },
  sm: { trackW: 36, trackH: 20, circleDia: 16, iconW: 10 },
  xs: { trackW: 30, trackH: 16, circleDia: 14, iconW: 9 },
} as const

/**
 * Evento compatível com handlers que esperam `ChangeEvent` de checkbox (`e.target.checked`).
 * Não espalhar o SyntheticEvent original: o `target` real é o `<button>` e alguns ambientes
 * acabam lendo `checked` indefinido — o toggle parece “morto” em todas as telas.
 */
function emitCheckboxLikeChange(
  nextChecked: boolean,
  native: React.MouseEvent<HTMLButtonElement>
): React.ChangeEvent<HTMLInputElement> {
  const btn = native.currentTarget
  const fakeTarget = {
    checked: nextChecked,
    value: nextChecked ? 'on' : '',
    type: 'checkbox',
    name: btn.getAttribute('name') ?? '',
    id: btn.id,
  } as HTMLInputElement

  return {
    target: fakeTarget,
    currentTarget: fakeTarget,
    nativeEvent: native.nativeEvent,
    bubbles: native.bubbles,
    cancelable: native.cancelable,
    defaultPrevented: native.defaultPrevented,
    preventDefault: () => native.preventDefault(),
    stopPropagation: () => native.stopPropagation(),
    isDefaultPrevented: () => native.defaultPrevented,
    isPropagationStopped: () => native.isPropagationStopped(),
    persist: () => {},
    timeStamp: native.timeStamp,
    type: 'change',
  } as unknown as React.ChangeEvent<HTMLInputElement>
}

/**
 * Switch pill (w-11 / thumb w-5 / ícones w-3), trilho vermelho/verde, ícones ✓/✕ em fill.
 * Usa `<button role="switch">` em vez de checkbox `sr-only`: o foco fica no controle visível,
 * evitando scrollIntoView extremo que quebrava modais com lista longa de switches.
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
  size = 'default',
  inputProps,
}: JiffyIconSwitchProps) {
  const generatedId = React.useId()
  const controlId = id ?? generatedId

  const {
    onClick: inputOnClick,
    onKeyDown: inputOnKeyDown,
    onFocus: inputOnFocus,
    onBlur: inputOnBlur,
    ...restInputProps
  } = inputProps ?? {}

  const { trackW, trackH, circleDia, iconW } = SIZES[size] ?? SIZES.default

  const offset = Math.round((trackH - circleDia) / 2)
  const circleLeft = checked ? trackW - circleDia - offset : offset

  const effectW = Math.round(circleDia / 2)
  const effectH = Math.max(1, Math.round(effectW / 2) - 1)
  const effectLeft = checked
    ? trackW - effectW - Math.round(effectW / 2) - offset
    : offset + Math.round(effectW / 2)

  const hasLabel = label != null && label !== ''
  const labelEl = hasLabel ? (
    <span
      className={cn(
        'select-none font-medium text-primary-text',
        size === 'xs' && 'text-[11px]',
        size === 'sm' && 'text-xs'
      )}
    >
      {label}
    </span>
  ) : null

  const track = (
    <div
      style={{
        width: trackW,
        height: trackH,
        background: checked ? COLOR_TRACK_ON : COLOR_TRACK_OFF,
        borderRadius: 9999,
        position: 'relative',
        flexShrink: 0,
        boxSizing: 'border-box',
        transition: TRANSITION,
        opacity: disabled ? 0.5 : 1,
      }}
      aria-hidden
    >
      {/* Linha decorativa atrás do thumb (efeito Galahhad) */}
      <span
        style={{
          position: 'absolute',
          width: effectW,
          height: effectH,
          left: effectLeft,
          top: '50%',
          transform: 'translateY(-50%)',
          background: '#fff',
          borderRadius: 1,
          transition: EFFECT_TRANSITION,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <span
        style={{
          width: circleDia,
          height: circleDia,
          background: '#fff',
          borderRadius: '50%',
          boxShadow: checked
            ? '-1px 1px 2px rgba(163, 163, 163, 0.45)'
            : '1px 1px 2px rgba(146, 146, 146, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'absolute',
          left: circleLeft,
          top: offset,
          zIndex: 1,
          transition: TRANSITION,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            width: iconW,
            height: iconW,
            position: 'absolute',
            color: COLOR_ICON_CHECK,
            transition: TRANSITION,
            opacity: checked ? 1 : 0,
            transform: checked ? 'scale(1)' : 'scale(0)',
          }}
          aria-hidden
        >
          <path d="M9.9997 15.1709L19.1921 5.97852L20.6063 7.39273L9.9997 17.9993L3.63574 11.6354L5.04996 10.2212L9.9997 15.1709Z" />
        </svg>

        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            width: iconW,
            height: iconW,
            position: 'absolute',
            color: COLOR_ICON_CROSS,
            transition: TRANSITION,
            opacity: checked ? 0 : 1,
            transform: checked ? 'scale(0)' : 'scale(1)',
          }}
          aria-hidden
        >
          <path d="M11.9997 10.5865L16.9495 5.63672L18.3637 7.05093L13.4139 12.0007L18.3637 16.9504L16.9495 18.3646L11.9997 13.4149L7.04996 18.3646L5.63574 16.9504L10.5855 12.0007L5.63574 7.05093L7.04996 5.63672L11.9997 10.5865Z" />
        </svg>
      </span>
    </div>
  )

  const handleToggle = (ev: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return
    const next = !checked
    onChange(emitCheckboxLikeChange(next, ev))
  }

  return (
    <button
      id={controlId}
      name={name}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      {...(restInputProps as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      type="button"
      className={cn(
        'flex items-center rounded-lg outline-none [overflow-anchor:none]',
        size === 'xs' ? 'gap-1 px-0 py-0'
        : size === 'sm' ? 'gap-1.5 px-1 py-0'
        : 'gap-3 px-4 py-1',
        'focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
        bordered && 'border border-[var(--color-primary)]',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        className
      )}
      onFocus={inputOnFocus as React.FocusEventHandler<HTMLButtonElement> | undefined}
      onBlur={inputOnBlur as React.FocusEventHandler<HTMLButtonElement> | undefined}
      onClick={(e) => {
        inputOnClick?.(e as unknown as React.MouseEvent<HTMLInputElement>)
        handleToggle(e)
      }}
      onKeyDown={(e) => {
        inputOnKeyDown?.(e as unknown as React.KeyboardEvent<HTMLInputElement>)
      }}
    >
      {labelPosition === 'start' ? labelEl : null}
      {labelPosition === 'end' ? (
        <>
          {track}
          {labelEl}
        </>
      ) : (
        track
      )}
    </button>
  )
}
