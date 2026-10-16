/**
 * Slug público oficial: o mesmo alfabeto do backend (letra, número e hífen).
 * WhatsApp e outros apps colam seta, emoji ou caractere invisível no fim do link.
 */
export function normalizarSlugPublico(raw: string): string {
  const decodificado = decodificarSlugPublico(raw)
  return decodificado
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function decodificarSlugPublico(raw: string): string {
  let value = raw.trim()
  for (let i = 0; i < 3; i += 1) {
    try {
      const decoded = decodeURIComponent(value.replace(/\+/g, ' '))
      if (decoded === value) break
      value = decoded
    } catch {
      break
    }
  }
  return value
}
