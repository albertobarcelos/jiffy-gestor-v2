import { SENHA_GESTOR_MIN_LENGTH } from '@/src/shared/utils/senhaGestorRules'

/**
 * Níveis da barra de força (alinhados às regras do gestor + comprimento extra).
 * "Muito forte" exige senha válida e mais de 8 caracteres (≥ 9).
 */
export type SenhaGestorForcaNivel =
  | 'muito_fraco'
  | 'fraco'
  | 'media'
  | 'forte'
  | 'muito_forte'

const CRITERIOS_TOTAIS = 4

/** Critérios: (1) ≥6 chars (2) maiúscula (3) especial (4) >8 chars */
export function senhaGestorCriteriosAtendidos(password: string): number {
  let n = 0
  if (password.length >= SENHA_GESTOR_MIN_LENGTH) n++
  if (/[A-Z]/.test(password)) n++
  if (/[^A-Za-z0-9]/.test(password)) n++
  if (password.length > 8) n++
  return n
}

export function senhaGestorForcaNivel(password: string): SenhaGestorForcaNivel {
  if (!password.length) {
    return 'muito_fraco'
  }
  const c = senhaGestorCriteriosAtendidos(password)
  if (c <= 0) return 'muito_fraco'
  if (c === 1) return 'fraco'
  if (c === 2) return 'media'
  if (c === 3) return 'forte'
  return 'muito_forte'
}

/** 0–100 para preenchimento da barra (4 segmentos de 25%). */
export function senhaGestorForcaPercentual(password: string): number {
  return Math.min(100, Math.round((senhaGestorCriteriosAtendidos(password) / CRITERIOS_TOTAIS) * 100))
}

export const SENHA_GESTOR_FORCA_LABEL: Record<SenhaGestorForcaNivel, string> = {
  muito_fraco: 'Muito fraca',
  fraco: 'Fraca',
  media: 'Média',
  forte: 'Forte',
  muito_forte: 'Muito forte',
}
