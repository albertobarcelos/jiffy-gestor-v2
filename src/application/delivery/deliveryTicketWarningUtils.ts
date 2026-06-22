import type { VendaGestorTicketWarning } from '@/src/shared/types/vendaGestorTickets'

function textoIndicaMapeamentoImpressoraAusente(text: string): boolean {
  const t = text.trim().toLowerCase()
  if (!t) return false
  return (
    t.includes('impressora lógica nesta estação') ||
    t.includes('impressora lógica nesta estacao') ||
    t.includes('sem vínculo com uma impressora do windows') ||
    t.includes('sem vinculo com uma impressora do windows')
  )
}

/** Aviso da API redundante — imprimirTicketsApiGestor já informa por ticket. */
export function warningRedundanteMapeamentoImpressoraWindows(
  warning: VendaGestorTicketWarning
): boolean {
  if (typeof warning === 'string') {
    return textoIndicaMapeamentoImpressoraAusente(warning)
  }

  const code = String(warning.code ?? '').trim()
  if (
    code === 'MAPEAMENTO_IMPRESSORA_NAO_CONFIGURADO' ||
    code === 'IMPRESSORA_WINDOWS_NAO_MAPEADA'
  ) {
    return true
  }

  return (
    textoIndicaMapeamentoImpressoraAusente(warning.message ?? '') ||
    textoIndicaMapeamentoImpressoraAusente(warning.detalhe ?? '')
  )
}
