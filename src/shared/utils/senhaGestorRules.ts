/**
 * Regras de senha do gestor (alinhadas ao produto e ao OpenAPI: mín. 6 + maiúscula + especial).
 */
export const SENHA_GESTOR_MIN_LENGTH = 6

/** Pelo menos uma maiúscula e um caractere especial (não letra nem dígito). */
export function senhaGestorEhValida(password: string): boolean {
  if (password.length < SENHA_GESTOR_MIN_LENGTH) return false
  if (!/[A-Z]/.test(password)) return false
  if (!/[^A-Za-z0-9]/.test(password)) return false
  return true
}

export const SENHA_GESTOR_MENSAGEM_ERRO =
  'A senha deve ter no mínimo 6 caracteres, incluindo 1 letra maiúscula e 1 caractere especial.'
