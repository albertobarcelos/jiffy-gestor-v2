import type { ModoImpressaoImpressora } from '@/src/domain/types/modoImpressaoImpressora'
import type {
  VendaGestorTicketItem,
  VendaGestorTicketItemComplemento,
} from '@/src/shared/types/vendaGestorTickets'

export type ProductionTicketKind = 'single' | 'unit' | 'conference'

export type ProductionTicketVia = {
  kind: ProductionTicketKind
  items: VendaGestorTicketItem[]
  unitIndex?: number
  unitTotal?: number
}

const EPS = 1e-9

function norm(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function qtyKey(value: number): string {
  return value.toFixed(4)
}

function quantidadeLinha(item: VendaGestorTicketItem): number {
  const q = Number(item.quantidade)
  return Number.isFinite(q) && q > 0 ? q : 1
}

function quantidadeComplemento(comp: VendaGestorTicketItemComplemento): number {
  const q = Number(comp.impressao?.quantidade ?? comp.quantidade)
  return Number.isFinite(q) && q > 0 ? q : 1
}

function complementoId(comp: VendaGestorTicketItemComplemento): string {
  return String(comp.complementoId ?? '').trim()
}

function complementoNome(comp: VendaGestorTicketItemComplemento): string {
  return String(comp.nome ?? comp.descricao ?? '')
}

function tipoImpacto(comp: VendaGestorTicketItemComplemento): string {
  return String(comp.tipoImpactoPreco ?? '')
}

function linhasObservacao(item: VendaGestorTicketItem): string[] {
  return String(item.observacao ?? '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
}

function chaveEquivalencia(item: VendaGestorTicketItem): string {
  const complementos = [...(item.complementos ?? [])].sort((a, b) => {
    const byNome = norm(complementoNome(a)).localeCompare(norm(complementoNome(b)))
    if (byNome !== 0) return byNome
    const byId = complementoId(a).localeCompare(complementoId(b))
    if (byId !== 0) return byId
    return qtyKey(quantidadeComplemento(a)).localeCompare(qtyKey(quantidadeComplemento(b)))
  })

  const complementoKey = complementos
    .map(
      c =>
        `${complementoId(c)}:${norm(complementoNome(c))}:${qtyKey(quantidadeComplemento(c))}:${tipoImpacto(c)}`
    )
    .join('|')

  const observacoes = linhasObservacao(item)
    .map(norm)
    .filter(Boolean)
    .sort()

  return `${item.produtoId ?? ''}#${complementoKey}#${observacoes.join('|')}`
}

function chaveComplemento(comp: VendaGestorTicketItemComplemento): string {
  return `${complementoId(comp)}|${norm(complementoNome(comp))}|${tipoImpacto(comp)}`
}

function somarComplementos(
  a: VendaGestorTicketItemComplemento[] | undefined,
  b: VendaGestorTicketItemComplemento[] | undefined
): VendaGestorTicketItemComplemento[] {
  const merged = new Map<string, VendaGestorTicketItemComplemento>()

  for (const complemento of [...(a ?? []), ...(b ?? [])]) {
    const key = chaveComplemento(complemento)
    const current = merged.get(key)
    if (!current) {
      merged.set(key, { ...complemento })
      continue
    }

    const qAtual = quantidadeComplemento(current)
    const qNovo = quantidadeComplemento(complemento)
    const q = qAtual + qNovo
    merged.set(key, {
      ...current,
      quantidade: q,
      impressao: {
        ...current.impressao,
        quantidade: q,
        valorUnitario: current.impressao?.valorUnitario ?? complemento.impressao?.valorUnitario,
        valorFinal: (current.impressao?.valorFinal ?? 0) + (complemento.impressao?.valorFinal ?? 0),
        valorTotal: (current.impressao?.valorTotal ?? 0) + (complemento.impressao?.valorTotal ?? 0),
      },
    })
  }

  return [...merged.values()]
}

function mesclarObservacoes(a: VendaGestorTicketItem, b: VendaGestorTicketItem): string | undefined {
  const seen = new Set<string>()
  const merged: string[] = []
  for (const linha of [...linhasObservacao(a), ...linhasObservacao(b)]) {
    const key = norm(linha)
    if (!key || seen.has(key)) continue
    seen.add(key)
    merged.push(linha)
  }
  return merged.length > 0 ? merged.join('\n') : undefined
}

function somarValor(a: number | undefined, b: number | undefined): number | undefined {
  if (a == null && b == null) return undefined
  return (a ?? 0) + (b ?? 0)
}

export function agruparItensProducaoEquivalentes(
  items: VendaGestorTicketItem[]
): VendaGestorTicketItem[] {
  const grouped = new Map<string, VendaGestorTicketItem>()

  for (const item of items) {
    const key = chaveEquivalencia(item)
    const current = grouped.get(key)
    if (!current) {
      grouped.set(key, { ...item, complementos: item.complementos ? [...item.complementos] : undefined })
      continue
    }

    grouped.set(key, {
      ...current,
      quantidade: quantidadeLinha(current) + quantidadeLinha(item),
      valorFinal: somarValor(current.valorFinal, item.valorFinal),
      valorTotal: somarValor(current.valorTotal, item.valorTotal),
      complementos: somarComplementos(current.complementos, item.complementos),
      observacao: mesclarObservacoes(current, item),
    })
  }

  return [...grouped.values()]
}

function comQuantidade(item: VendaGestorTicketItem, quantidade: number): VendaGestorTicketItem {
  const atual = quantidadeLinha(item)
  const ratio = atual > 0 ? quantidade / atual : 1
  const scale = (v: number | undefined) => (v == null ? undefined : v * ratio)
  return {
    ...item,
    quantidade,
    valorFinal: scale(item.valorFinal),
    valorTotal: scale(item.valorTotal),
  }
}

export function dividirItensProducaoPorUnidade(items: VendaGestorTicketItem[]): VendaGestorTicketItem[] {
  const units: VendaGestorTicketItem[] = []

  for (const item of items) {
    const qty = quantidadeLinha(item)
    if (qty <= EPS) {
      units.push(item)
      continue
    }

    const whole = Math.floor(qty)
    const remainder = qty - whole

    for (let i = 0; i < whole; i += 1) {
      units.push(comQuantidade(item, 1))
    }
    if (remainder > EPS) {
      units.push(comQuantidade(item, remainder))
    }
  }

  return units
}

function planPorUnidade(items: VendaGestorTicketItem[]): ProductionTicketVia[] {
  const units = dividirItensProducaoPorUnidade(items)
  const total = units.length
  const tickets: ProductionTicketVia[] = units.map((unit, i) => ({
    kind: 'unit' as const,
    items: [unit],
    unitIndex: i + 1,
    unitTotal: total,
  }))

  if (total > 1) {
    tickets.push({
      kind: 'conference',
      items: agruparItensProducaoEquivalentes(items),
    })
  }

  return tickets
}

/**
 * Espelho do `ProductionTicketPlanner` do PDV.
 * No delivery, `ficha` comporta-se como `normal` (QR de evento não se aplica).
 */
export function planejarTicketsProducaoImpressora(
  items: VendaGestorTicketItem[],
  modo: ModoImpressaoImpressora
): ProductionTicketVia[] {
  if (items.length === 0) return []

  switch (modo) {
    case 'agrupado':
      return [{ kind: 'single', items: agruparItensProducaoEquivalentes(items) }]
    case 'porUnidade':
      return planPorUnidade(items)
    case 'normal':
    case 'ficha':
      return [{ kind: 'single', items }]
    default:
      return [{ kind: 'single', items }]
  }
}

export function ticketIdViaProducao(
  impressoraId: string | null | undefined,
  kind: ProductionTicketKind,
  index: number
): string {
  const base = (impressoraId ?? 'sem-impressora').trim() || 'sem-impressora'
  return `${base}-producao-${kind}-${index + 1}`
}
