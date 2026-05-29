/** Normaliza telefone brasileiro para link wa.me (DDI 55 + DDD + número). */
export function normalizarTelefoneWhatsapp(valor: string | null | undefined): string {
  const digits = String(valor ?? '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('55')) return digits
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  return digits
}

export function telefoneValidoParaWhatsapp(valor: string | null | undefined): boolean {
  const numero = normalizarTelefoneWhatsapp(valor)
  return numero.length >= 12 && numero.length <= 13
}

export function montarLinkWhatsapp(
  telefone: string | null | undefined,
  mensagem: string
): string | null {
  const numero = normalizarTelefoneWhatsapp(telefone)
  if (!telefoneValidoParaWhatsapp(telefone)) return null
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`
}

export function abrirWhatsapp(
  telefone: string | null | undefined,
  mensagem: string
): boolean {
  const link = montarLinkWhatsapp(telefone, mensagem)
  if (!link) return false
  window.open(link, '_blank', 'noopener,noreferrer')
  return true
}
