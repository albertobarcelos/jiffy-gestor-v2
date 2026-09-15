/** Remove não dígitos e limita a 8 caracteres */
export function normalizarDigitosCep(valor: string): string {
  return valor.replace(/\D/g, '').slice(0, 8)
}

/** Máscara brasileira 00000-000 */
export function formatarCepMascara(valor: string): string {
  const numeros = normalizarDigitosCep(valor)
  if (numeros.length <= 5) return numeros
  return `${numeros.slice(0, 5)}-${numeros.slice(5)}`
}
