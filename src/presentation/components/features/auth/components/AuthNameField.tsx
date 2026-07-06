'use client'

import type { InputHTMLAttributes } from 'react'
import { AuthPersonIcon } from '@/src/presentation/components/features/auth/components/auth-input-icons'
import { authFluid } from '@/src/presentation/components/features/auth/components/auth-input-fluid'
import { cn } from '@/src/shared/utils/cn'

type Props = {
  label: string
  error?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

/** Nome com ícone de pessoa à esquerda — mesmo padrão do `AuthEmailField`. */
export function AuthNameField({ label, error, className, disabled, ...rest }: Props) {
  return (
    <div>
      <label className={authFluid.label}>{label}</label>
      <div className="relative">
        <div className={authFluid.iconLeft}>
          <AuthPersonIcon className={authFluid.iconSvg} />
        </div>
        <input
          type="text"
          disabled={disabled}
          autoComplete="name"
          className={cn(
            authFluid.shell,
            authFluid.textAndPy,
            authFluid.padIconField,
            error ? 'border-error' : '',
            disabled ? 'cursor-not-allowed opacity-50' : '',
            className
          )}
          {...rest}
        />
      </div>
      {error ? <p className="mt-1 text-sm text-error">{error}</p> : null}
    </div>
  )
}
