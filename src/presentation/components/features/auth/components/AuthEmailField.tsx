'use client'

import type { InputHTMLAttributes } from 'react'
import { AuthEnvelopeIcon } from '@/src/presentation/components/features/auth/components/auth-input-icons'
import { authFluid } from '@/src/presentation/components/features/auth/components/auth-input-fluid'
import { cn } from '@/src/shared/utils/cn'

type Props = {
  label: string
  error?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

/** E-mail com ícone de envelope à esquerda — mesmo padrão visual do `LoginForm`. */
export function AuthEmailField({ label, error, className, disabled, ...rest }: Props) {
  return (
    <div>
      <label className={authFluid.label}>{label}</label>
      <div className="relative">
        <div className={authFluid.iconLeft}>
          <AuthEnvelopeIcon className={authFluid.iconSvg} />
        </div>
        <input
          type="email"
          disabled={disabled}
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
