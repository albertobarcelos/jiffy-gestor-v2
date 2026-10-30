import type {
  PizzaCategoriaDraft,
  PizzaLinhaComplementoDraft,
  PizzaSaborPrecoDraft,
  PizzaTamanhoDraft,
} from '@/src/application/dto/pizza/pizzaDraftTypes'

export type {
  PizzaAdicionalDraft,
  PizzaCategoriaDraft,
  PizzaLinhaComplementoDraft,
  PizzaSaborDraft,
  PizzaSaborPrecoDraft,
  PizzaTamanhoDraft,
} from '@/src/application/dto/pizza/pizzaDraftTypes'

export function createLocalId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function createDefaultPizzaCategoriaDraft(nome = ''): PizzaCategoriaDraft {
  return {
    nome,
    corHex: '#530CA3',
    iconName: 'pizza',
    ativo: true,
    regraPrecoMultiplosSabores: 'proporcional',
    permiteDesconto: true,
    permiteAcrescimo: true,
    impressorasIds: [],
    tamanhos: DEFAULT_TAMANHOS.map(t => ({ ...t, localId: createLocalId() })),
    sabores: [],
    adicionais: [],
    massas: DEFAULT_MASSAS.map(m => ({ ...m, localId: createLocalId() })),
    bordas: DEFAULT_BORDAS.map(b => ({ ...b, localId: createLocalId() })),
  }
}

export const DEFAULT_TAMANHOS: Omit<PizzaTamanhoDraft, 'localId'>[] = [
  { nome: 'PEQUENA', quantidadePedacos: 1, quantidadeMaximaDivisoes: 1, ativo: true },
  { nome: 'MÉDIA', quantidadePedacos: 6, quantidadeMaximaDivisoes: 2, ativo: true },
  { nome: 'GRANDE', quantidadePedacos: 8, quantidadeMaximaDivisoes: 2, ativo: true },
]

export const DEFAULT_MASSAS: Omit<PizzaLinhaComplementoDraft, 'localId'>[] = [
  { nome: 'TRADICIONAL', valor: 0, ativo: true },
]

export const DEFAULT_BORDAS: Omit<PizzaLinhaComplementoDraft, 'localId'>[] = [
  { nome: 'TRADICIONAL', valor: 0, ativo: true },
]

export function serializePizzaDraft(draft: PizzaCategoriaDraft) {
  return JSON.stringify(draft)
}

/**
 * Garante entrada de preço para cada tamanho.
 * Tamanho novo ou com valor <= 0 fica desmarcado (não vai para a venda zerado).
 */
export function ensurePrecosParaTamanhos(
  precos: Record<string, PizzaSaborPrecoDraft>,
  tamanhoLocalIds: string[]
): Record<string, PizzaSaborPrecoDraft> {
  let changed = false
  const next: Record<string, PizzaSaborPrecoDraft> = { ...precos }

  for (const localId of tamanhoLocalIds) {
    if (!localId) continue
    const atual = next[localId]
    if (!atual) {
      next[localId] = { enabled: false, valor: 0 }
      changed = true
      continue
    }
    if (atual.valor <= 0 && atual.enabled) {
      next[localId] = { enabled: false, valor: 0 }
      changed = true
    }
  }

  return changed ? next : precos
}

/** Propaga tamanhos novos/zerados para sabores e adicionais do draft. */
export function syncDraftPrecosComTamanhos(draft: PizzaCategoriaDraft): PizzaCategoriaDraft {
  const tamanhoLocalIds = draft.tamanhos.map(t => t.localId)
  return {
    ...draft,
    sabores: draft.sabores.map(sabor => ({
      ...sabor,
      precosPorTamanhoLocalId: ensurePrecosParaTamanhos(
        sabor.precosPorTamanhoLocalId,
        tamanhoLocalIds
      ),
    })),
    adicionais: draft.adicionais.map(adicional => ({
      ...adicional,
      precosPorTamanhoLocalId: ensurePrecosParaTamanhos(
        adicional.precosPorTamanhoLocalId,
        tamanhoLocalIds
      ),
    })),
  }
}

const MONEY = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatPizzaMoney(value: number) {
  return MONEY.format(value)
}

export function textoSaboresTamanho(maxDivisoes: number) {
  if (maxDivisoes <= 1) return 'Aceita 1 sabor'
  return `Aceita 1 e ${maxDivisoes} sabores`
}

export function textoPedacos(pedacos: number) {
  return pedacos === 1 ? 'Cortada em 1 pedaço' : `Cortada em ${pedacos} pedaços`
}
