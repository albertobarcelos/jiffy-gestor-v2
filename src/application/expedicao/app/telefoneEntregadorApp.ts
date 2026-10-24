/** Só dígitos, com DDI 55 se o número brasileiro veio sem país. */
export function digitosTelefoneApp(telefone: string | null | undefined): string | null {
  const digitos = String(telefone ?? '').replace(/\D/g, '')
  if (digitos.length < 8) return null
  if (digitos.startsWith('55') && digitos.length >= 12) return digitos
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`
  return digitos
}

export function hrefLigarApp(telefone: string | null | undefined): string | null {
  const digitos = digitosTelefoneApp(telefone)
  return digitos ? `tel:+${digitos}` : null
}

export function hrefWhatsAppApp(telefone: string | null | undefined): string | null {
  const digitos = digitosTelefoneApp(telefone)
  return digitos ? `https://wa.me/${digitos}` : null
}
