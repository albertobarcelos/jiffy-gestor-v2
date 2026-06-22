const MAX_DIGITOS_TELEFONE_BR = 11

/** Apenas dígitos (máx. 11) — use para API e persistência. */
export function extrairDigitosTelefone(valor: string): string {
  return valor.replace(/\D/g, '').slice(0, MAX_DIGITOS_TELEFONE_BR)
}

/** Máscara visual brasileira; não enviar o retorno para o backend. */
export function formatarTelefoneBr(valor: string): string {
  const numeros = extrairDigitosTelefone(valor)
  if (numeros.length === 0) return ''
  if (numeros.length <= 2) return `(${numeros}`
  if (numeros.length <= 6) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`
  if (numeros.length <= 10) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`
  }
  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`
}
