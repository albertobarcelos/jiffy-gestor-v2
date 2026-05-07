'use client'

import { Eye, Info } from 'lucide-react'
import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { AuthLockIcon } from '@/src/presentation/components/features/auth/components/auth-input-icons'
import { authFluid } from '@/src/presentation/components/features/auth/components/auth-input-fluid'
import { cn } from '@/src/shared/utils/cn'

type Props = {
  label: string
  /** Texto exibido no tooltip ao passar o mouse / foco no ícone de informação (à direita do título). */
  labelHint?: string
  footer?: ReactNode
  inputClassName?: string
  /** Ícone de cadeado à esquerda (mesmo padrão do login). */
  leadingLockIcon?: boolean
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

/**
 * Campo de senha com ícone de olho: a senha só fica visível enquanto o usuário mantém o pressionar no ícone.
 */
export function PasswordFieldPressReveal({
  label,
  labelHint,
  footer,
  disabled,
  className,
  inputClassName,
  leadingLockIcon = false,
  id: idProp,
  ...rest
}: Props) {
  const uid = useId()
  const fieldId = idProp ?? `pwd-${uid}`
  const hintTooltipId = `${fieldId}-requisitos`

  const [reveal, setReveal] = useState(false)
  const busy = Boolean(disabled)

  const ocultar = () => setReveal(false)

  return (
    <div className={cn(className)}>
      <div className="mb-[clamp(0.25rem,0.85vmin,0.5rem)] flex items-center gap-1.5">
        <label
          htmlFor={fieldId}
          className="font-medium text-gray-700 text-[clamp(0.6875rem,2.1vmin,0.875rem)]"
        >
          {label}
        </label>
        {labelHint ? (
          <span className="group/tooltip relative inline-flex shrink-0">
            <button
              type="button"
              tabIndex={0}
              className="rounded-full p-0.5 text-gray-500 outline-none ring-offset-2 transition-colors hover:text-gray-800 focus-visible:ring-2 focus-visible:ring-[#00B074]"
              aria-label={labelHint}
              aria-describedby={hintTooltipId}
            >
              <Info className="h-[clamp(0.75rem,2.6vmin,1rem)] w-[clamp(0.75rem,2.6vmin,1rem)]" aria-hidden strokeWidth={2} />
            </button>
            <span
              id={hintTooltipId}
              role="tooltip"
              className="pointer-events-none invisible absolute left-0 top-full z-30 mt-1.5 w-[min(calc(100vw-2rem),18rem)] rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-xs leading-snug text-gray-700 shadow-lg opacity-0 ring-1 ring-black/5 transition-opacity duration-150 group-hover/tooltip:visible group-hover/tooltip:opacity-100 group-focus-within/tooltip:visible group-focus-within/tooltip:opacity-100"
            >
              {labelHint}
            </span>
          </span>
        ) : null}
      </div>
      <div className="relative">
        {leadingLockIcon ? (
          <div className={authFluid.iconLeft}>
            <AuthLockIcon className={authFluid.iconSvg} />
          </div>
        ) : null}
        <input
          {...rest}
          id={fieldId}
          type={reveal ? 'text' : 'password'}
          disabled={busy}
          className={cn(
            authFluid.shell,
            authFluid.textAndPy,
            leadingLockIcon ? authFluid.padPwdField : authFluid.padPwdNoLock,
            inputClassName
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={busy}
          aria-label="Segure para exibir a senha"
          aria-pressed={reveal}
          className={cn(authFluid.eyeBtn, busy && 'cursor-not-allowed opacity-50')}
          onMouseDown={e => {
            if (busy) return
            e.preventDefault()
            setReveal(true)
          }}
          onMouseUp={ocultar}
          onMouseLeave={ocultar}
          onTouchStart={e => {
            if (busy) return
            e.preventDefault()
            setReveal(true)
          }}
          onTouchEnd={ocultar}
          onTouchCancel={ocultar}
        >
          <Eye className={authFluid.eyeIcon} aria-hidden strokeWidth={2} />
        </button>
      </div>
      {footer ? <div className="mt-1">{footer}</div> : null}
    </div>
  )
}
