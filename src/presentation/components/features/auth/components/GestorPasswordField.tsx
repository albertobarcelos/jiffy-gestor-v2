'use client'

import type { InputHTMLAttributes } from 'react'
import { PasswordFieldPressReveal } from './PasswordFieldPressReveal'
import { SenhaGestorForcaBar } from './SenhaGestorForcaBar'
import { SENHA_GESTOR_MENSAGEM_ERRO } from '@/src/shared/utils/senhaGestorRules'

export type GestorPasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string
  /** Prefixo único para ids da barra de força e acessibilidade na página. */
  forcaBarIdPrefix: string
  /** Tooltip ao lado do label com as regras da senha. Por padrão usa a mensagem do gestor. */
  labelHint?: string
  /** Se false, não exibe o ícone de informação no label. Default true. */
  mostrarHintNoLabel?: boolean
  /** Classe extra na barra de força (ex.: pt-0.5). */
  forcaBarClassName?: string
}

/**
 * Campo de senha com revelar ao pressionar + barra de força do gestor + tooltip opcional com as regras.
 */
export function GestorPasswordField({
  label,
  forcaBarIdPrefix,
  labelHint = SENHA_GESTOR_MENSAGEM_ERRO,
  mostrarHintNoLabel = true,
  forcaBarClassName = 'pt-0.5',
  value,
  ...rest
}: GestorPasswordFieldProps) {
  const password = typeof value === 'string' ? value : ''
  return (
    <PasswordFieldPressReveal
      label={label}
      labelHint={mostrarHintNoLabel ? labelHint : undefined}
      value={value}
      footer={
        <SenhaGestorForcaBar
          password={password}
          idPrefix={forcaBarIdPrefix}
          className={forcaBarClassName}
        />
      }
      {...rest}
    />
  )
}
