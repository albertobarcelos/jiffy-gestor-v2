const LOCALE_PT = 'pt-BR'

/** Primeira letra visível em maiúscula (pt-BR), sem trim — válido durante a digitação. */
export function capitalizarPrimeiraLetra(valor: string, locale = LOCALE_PT): string {
  const indice = valor.search(/\S/u)
  if (indice < 0) return valor
  return (
    valor.slice(0, indice) +
    valor.charAt(indice).toLocaleUpperCase(locale) +
    valor.slice(indice + 1)
  )
}
