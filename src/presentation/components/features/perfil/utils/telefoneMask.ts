/** Mantém só dígitos, limitado a 11 (DDD + 9 dígitos). */
export function somenteDigitosTelefone(value: string): string {
  return value.replace(/\D/g, '').slice(0, 11)
}

/**
 * Aplica máscara de telefone brasileiro durante a digitação.
 * - 10 dígitos: (11) 1234-5678
 * - 11 dígitos: (11) 91234-5678
 */
export function aplicarMascaraTelefone(value: string): string {
  const d = somenteDigitosTelefone(value)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  }
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}
