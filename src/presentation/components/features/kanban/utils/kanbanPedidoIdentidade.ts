export type TipoAtendimentoKanban = 'entrega' | 'retirada' | 'balcao'

export function nomeClienteCurtoKanban(nome: string | null | undefined): string {
  const limpo = String(nome ?? '')
    .trim()
    .replace(/\s+/g, ' ')
  if (!limpo) return '—'

  const partes = limpo.split(' ')
  if (partes.length === 1) return partes[0] ?? '—'

  const primeiro = partes[0] ?? ''
  const ultimo = partes[partes.length - 1] ?? ''
  const inicial = ultimo.charAt(0).toUpperCase()
  return inicial ? `${primeiro} ${inicial}.` : primeiro
}

export function tipoAtendimentoKanban(tipoVenda: string | null | undefined): TipoAtendimentoKanban {
  const tipo = String(tipoVenda ?? '')
    .trim()
    .toLowerCase()
  if (tipo === 'retirada') return 'retirada'
  if (tipo === 'entrega' || tipo === 'delivery') return 'entrega'
  return 'balcao'
}

export function rotuloTipoAtendimentoKanban(tipo: TipoAtendimentoKanban): string {
  if (tipo === 'retirada') return 'Retirada'
  if (tipo === 'entrega') return 'Entrega'
  return 'Balcão'
}

export function rotuloStatusFinanceiroKanban(status: string | null | undefined): string {
  const s = String(status ?? '')
    .trim()
    .toLowerCase()
  if (s === 'pago') return 'Pago'
  if (s === 'parcial') return 'Parcial'
  if (s === 'cancelado') return 'Cancelado'
  if (s === 'pendente') return 'Pendente'
  return '—'
}
