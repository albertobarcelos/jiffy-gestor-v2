'use client'

import { Input, type InputProps } from '@/src/presentation/components/ui/input'
import { useLocaleUppercaseInputHandler } from '@/src/presentation/hooks/useLocaleUppercaseInputHandler'

export interface UppercaseLocaleInputProps extends Omit<InputProps, 'onChange'> {
  onValueChange: (value: string) => void
}

/**
 * Input MUI com maiúsculas pt-BR no onChange sem pular o cursor ao editar no meio.
 */
export function UppercaseLocaleInput({
  value,
  onValueChange,
  maxLength,
  inputProps,
  ...props
}: UppercaseLocaleInputProps) {
  const resolvedMaxLength =
    maxLength ?? (typeof inputProps?.maxLength === 'number' ? inputProps.maxLength : undefined)

  const { inputRef, handleChange } = useLocaleUppercaseInputHandler(
    String(value ?? ''),
    onValueChange,
    { maxLength: resolvedMaxLength }
  )

  return (
    <Input
      {...props}
      value={value}
      onChange={handleChange}
      inputRef={inputRef}
      maxLength={maxLength}
      inputProps={inputProps}
    />
  )
}
