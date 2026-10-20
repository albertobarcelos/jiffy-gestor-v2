'use client'

import { forwardRef, useCallback } from 'react'
import { useLocaleUppercaseInputHandler } from '@/src/presentation/hooks/useLocaleUppercaseInputHandler'

type DeliveryCheckoutUppercaseInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value'
> & {
  value: string
  onValueChange: (value: string) => void
}

export const DeliveryCheckoutUppercaseInput = forwardRef<
  HTMLInputElement,
  DeliveryCheckoutUppercaseInputProps
>(function DeliveryCheckoutUppercaseInput(
  { value, onValueChange, maxLength, className, style, onFocus, ...props },
  forwardedRef
) {
  const { inputRef, handleChange } = useLocaleUppercaseInputHandler(value, onValueChange, {
    maxLength,
  })

  const setRefs = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node
      if (typeof forwardedRef === 'function') {
        forwardedRef(node)
      } else if (forwardedRef) {
        forwardedRef.current = node
      }
    },
    [forwardedRef, inputRef]
  )

  const handleFocus = useCallback(
    (event: React.FocusEvent<HTMLInputElement>) => {
      onFocus?.(event)
      if (event.defaultPrevented) return
      if (!value.trim()) return
      // Seleciona após o foco estabilizar (melhor em mobile/Safari).
      const el = event.currentTarget
      requestAnimationFrame(() => {
        el.select()
      })
    },
    [onFocus, value]
  )

  return (
    <input
      {...props}
      ref={setRefs}
      value={value}
      onChange={handleChange}
      onFocus={handleFocus}
      maxLength={maxLength}
      className={className}
      style={style}
    />
  )
})
