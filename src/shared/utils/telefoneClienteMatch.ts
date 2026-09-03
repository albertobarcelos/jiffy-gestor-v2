/** Dígitos do telefone, sem máscara. */
export function digitosTelefone(valor: string | null | undefined): string {
  return String(valor ?? '').replace(/\D/g, '')
}

/**
 * Cadastro BR (DDD + número) vs WhatsApp (55 + DDD + número).
 * Não usa só os 8 finais — colide entre DDDs.
 */
export function normalizarTelefoneComparacao(valor: string | null | undefined): string {
  let d = digitosTelefone(valor)
  if (d.startsWith('55') && d.length >= 12) d = d.slice(2)
  if (d.length > 11) d = d.slice(-11)
  return d
}

export function telefonesCorrespondem(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const da = normalizarTelefoneComparacao(a)
  const db = normalizarTelefoneComparacao(b)
  if (!da || !db) return false
  if (da === db) return true
  const curto = da.length <= db.length ? da : db
  const longo = da.length <= db.length ? db : da
  return curto.length >= 10 && longo.endsWith(curto)
}

/** Termo para a API de clientes: DDD + número, sem DDI. */
export function termoBuscaClientePorTelefone(whatsappDigits: string): string {
  return normalizarTelefoneComparacao(whatsappDigits)
}

export function clienteTelefoneContem(
  telefone: string | null | undefined,
  termo: string
): boolean {
  const dt = digitosTelefone(telefone)
  const dq = termo.replace(/\D/g, '')
  return dq.length >= 4 && dt.includes(dq)
}
