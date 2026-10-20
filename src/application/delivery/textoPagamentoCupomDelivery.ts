import type { VendaGestorTicketsPagamento } from '@/src/shared/types/vendaGestorTickets'

export type MeioCupomLinha = {
  nome: string
  valor: number
}

export type AvisoCobrancaEntregadorCupom = {
  linhas: Array<{ left: string; right: string }>
}

function numeroFinito(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function nomeMeio(m: { nome?: string; tipo?: string }): string {
  return (m.nome || m.tipo || 'pagamento').trim() || 'pagamento'
}

export function meiosJaPagosCupom(
  pagamento: VendaGestorTicketsPagamento | null | undefined
): MeioCupomLinha[] {
  return (pagamento?.meios ?? [])
    .filter(m => !m.naEntrega)
    .map(m => ({ nome: nomeMeio(m), valor: numeroFinito(m.valor) }))
    .filter(m => m.valor > 0)
}

export function meiosCobrarNaEntregaCupom(
  pagamento: VendaGestorTicketsPagamento | null | undefined
): MeioCupomLinha[] {
  return (pagamento?.meios ?? [])
    .filter(m => m.naEntrega)
    .map(m => ({ nome: nomeMeio(m), valor: numeroFinito(m.valor) }))
    .filter(m => m.valor > 0)
}

export function deveCobrarNaEntregaCupom(
  pagamento: VendaGestorTicketsPagamento | null | undefined
): boolean {
  if (!pagamento) return false
  if (meiosCobrarNaEntregaCupom(pagamento).length > 0) return true
  const receber = numeroFinito(pagamento.valorCobrarNaEntrega)
  const status = String(pagamento.status || '').toLowerCase()
  return (
    pagamento.cobrarCliente === true ||
    status === 'pendente' ||
    receber > 0
  )
}

export function linhasResumoPagamentoCupom(
  pagamento: VendaGestorTicketsPagamento | null | undefined,
  formatarValor: (valor: number) => string
): Array<{ left: string; right: string }> {
  const pagos = meiosJaPagosCupom(pagamento)
  if (pagos.length > 0) {
    return pagos.map(m => ({
      left: `Pago em ${m.nome.toUpperCase()}`,
      right: formatarValor(m.valor),
    }))
  }
  const recebido = numeroFinito(pagamento?.valorRecebido)
  if (recebido > 0) {
    return [{ left: 'Valor pago', right: formatarValor(recebido) }]
  }
  return []
}

function linhasCobrarFormaValor(
  meios: MeioCupomLinha[],
  formatarValor: (valor: number) => string
): Array<{ left: string; right: string }> {
  return meios.map(m => ({
    left: `COBRAR ${m.nome.toUpperCase()}`,
    right: formatarValor(m.valor),
  }))
}

export function avisoCobrancaEntregadorCupom(
  pagamento: VendaGestorTicketsPagamento | null | undefined,
  formatarValor: (valor: number) => string
): AvisoCobrancaEntregadorCupom | null {
  if (!deveCobrarNaEntregaCupom(pagamento)) return null

  const meios = meiosCobrarNaEntregaCupom(pagamento)
  const receber = numeroFinito(pagamento?.valorCobrarNaEntrega)
  const fallbackNome =
    pagamento?.meioPagamento?.trim() || pagamento?.formaPagamento?.trim() || 'pagamento'

  if (meios.length > 0) {
    return { linhas: linhasCobrarFormaValor(meios, formatarValor) }
  }

  if (receber > 0) {
    return {
      linhas: [{ left: `COBRAR ${fallbackNome.toUpperCase()}`, right: formatarValor(receber) }],
    }
  }

  return null
}
