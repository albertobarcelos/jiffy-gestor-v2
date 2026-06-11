/** Iniciais para avatar (prioriza nome; senão e-mail). */
export function getPerfilIniciais(nome: string, email: string): string {
  const nomeTrim = nome.trim()
  if (nomeTrim) {
    const partes = nomeTrim.split(/\s+/).filter(Boolean)
    if (partes.length >= 2) {
      return `${partes[0].charAt(0)}${partes[partes.length - 1].charAt(0)}`.toUpperCase()
    }
    return partes[0].charAt(0).toUpperCase()
  }
  const emailTrim = email.trim()
  return emailTrim ? emailTrim.charAt(0).toUpperCase() : 'U'
}

export function perfilValorOuPlaceholder(valor: string | null | undefined, placeholder: string): string {
  const t = valor?.trim()
  return t && t.length > 0 ? t : placeholder
}
