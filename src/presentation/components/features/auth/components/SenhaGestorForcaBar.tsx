'use client'

import { cn } from '@/src/shared/utils/cn'
import {
  senhaGestorCriteriosAtendidos,
  senhaGestorForcaNivel,
  senhaGestorForcaPercentual,
  SENHA_GESTOR_FORCA_LABEL,
} from '@/src/shared/utils/senhaGestorForca'

/** Cor única dos segmentos preenchidos conforme quantidade de critérios (1–4). */
function corPreenchimento(criterios: number): string {
  if (criterios <= 1) {
    return 'bg-red-500'
  }
  if (criterios === 2) {
    return 'bg-amber-500'
  }
  if (criterios === 3) {
    return 'bg-lime-500'
  }
  return 'bg-[#00B074]'
}

/**
 * Barra segmentada + rótulo da força da senha (regras do gestor).
 */
export function SenhaGestorForcaBar({
  password,
  className,
  idPrefix = 'senha-forca',
}: {
  password: string
  className?: string
  /** Prefixo para ids acessíveis únicos na página. */
  idPrefix?: string
}) {
  const criterios = senhaGestorCriteriosAtendidos(password)
  const nivel = senhaGestorForcaNivel(password)
  const percentual = senhaGestorForcaPercentual(password)
  const label = SENHA_GESTOR_FORCA_LABEL[nivel]
  const labelId = `${idPrefix}-label`

  return (
    <div className={cn('space-y-1.5', className)}>
      <div
        className="flex h-1.5 gap-1 overflow-hidden rounded-full"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentual}
        aria-valuetext={label}
        aria-labelledby={labelId}
      >
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={cn(
              'h-full min-w-0 flex-1 rounded-full transition-colors duration-200',
              criterios > 0 && i < criterios ? corPreenchimento(criterios) : 'bg-gray-200'
            )}
          />
        ))}
      </div>
      <p id={labelId} className="text-xs font-medium text-gray-600" aria-live="polite">
        Força da senha:{' '}
        <span className="font-semibold text-primary-text">{label}</span>
      </p>
    </div>
  )
}
