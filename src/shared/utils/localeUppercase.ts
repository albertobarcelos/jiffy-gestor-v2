const LOCALE_PT = 'pt-BR'

export function toLocaleUppercasePt(valor: string, locale = LOCALE_PT): string {
  return valor.toLocaleUpperCase(locale)
}
