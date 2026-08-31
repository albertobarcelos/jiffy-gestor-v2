const TITULOS_GENERICOS = new Set(['whatsapp', 'você', 'you', 'mensagem', 'messages'])

export function normalizarNomePessoa(valor: string | null | undefined): string {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function tituloConversaGenerico(titulo: string | null | undefined): boolean {
  const n = normalizarNomePessoa(titulo)
  return !n || TITULOS_GENERICOS.has(n)
}

export function nomesCorrespondem(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const na = normalizarNomePessoa(a)
  const nb = normalizarNomePessoa(b)
  return na.length >= 3 && na === nb
}

/** Identidade estável da conversa: número, senão o nome do contato. */
export function idConversaWhatsApp(
  telefone: string | null | undefined,
  titulo: string | null | undefined
): string {
  const tel = String(telefone ?? '').replace(/\D/g, '')
  if (tel.length >= 10) return `tel:${tel.slice(-11)}`
  if (!tituloConversaGenerico(titulo)) return `nome:${normalizarNomePessoa(titulo)}`
  return ''
}

/** Número que some e volta, ou nome vs número da mesma conversa, não é troca de contato. */
export function conversaEhAMesma(anterior: string, atual: string): boolean {
  if (!atual) return true
  if (!anterior) return false
  if (anterior === atual) return true
  const tipoAntes = anterior.slice(0, anterior.indexOf(':'))
  const tipoAgora = atual.slice(0, atual.indexOf(':'))
  return tipoAntes !== tipoAgora
}
