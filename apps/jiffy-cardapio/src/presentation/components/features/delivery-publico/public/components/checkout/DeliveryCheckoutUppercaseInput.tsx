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
  { value, onValueChange, maxLength, className, style, ...props },
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

  return (
    <input
      {...props}
      ref={setRefs}
      value={value}
      onChange={handleChange}
      maxLength={maxLength}
      className={className}
      style={style}
    />
  )
})
