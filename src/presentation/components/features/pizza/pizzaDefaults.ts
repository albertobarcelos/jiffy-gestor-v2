import type {
  CreateCategoriaPizzaCompletoInput,
  RegraPrecoMultiplosSabores,
  TipoImpactoPreco,
} from '@/src/shared/types/pizza'

export type PizzaLinhaComplementoDraft = {
  localId: string
  nome: string
  valor: number
  ativo: boolean
}

export type PizzaTamanhoDraft = {
  localId: string
  nome: string
  quantidadePedacos: number
  quantidadeMaximaDivisoes: number
  ativo: boolean
}

export type PizzaSaborPrecoDraft = {
  enabled: boolean
  valor: number
}

export type PizzaSaborDraft = {
  localId: string
  nome: string
  descricao: string
  ativo: boolean
  /** Preços indexados pelo localId do tamanho no draft. */
  precosPorTamanhoLocalId: Record<string, PizzaSaborPrecoDraft>
}

export type PizzaAdicionalDraft = {
  localId: string
  complementoId: string
  ativo: boolean
  /** Preços indexados pelo localId do tamanho no draft. */
  precosPorTamanhoLocalId: Record<string, PizzaSaborPrecoDraft>
}

export type PizzaCategoriaDraft = {
  nome: string
  corHex: string
  iconName: string
  ativo: boolean
  regraPrecoMultiplosSabores: RegraPrecoMultiplosSabores
  permiteDesconto: boolean
  permiteAcrescimo: boolean
  impressorasIds: string[]
  tamanhos: PizzaTamanhoDraft[]
  sabores: PizzaSaborDraft[]
  adicionais: PizzaAdicionalDraft[]
  massas: PizzaLinhaComplementoDraft[]
  bordas: PizzaLinhaComplementoDraft[]
}

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

export function buildCreateCompletoPayload(
  draft: PizzaCategoriaDraft,
  options?: { menuId?: string }
): CreateCategoriaPizzaCompletoInput {
  const tamanhos = draft.tamanhos
    .filter(t => t.nome.trim() && t.ativo)
    .map(t => ({
      nome: t.nome.trim(),
      quantidadePedacos: Math.max(1, t.quantidadePedacos || 1),
      quantidadeMaximaDivisoes: Math.min(4, Math.max(1, t.quantidadeMaximaDivisoes || 1)),
      ativo: t.ativo,
    }))

  const massasValidas = draft.massas.filter(m => m.nome.trim())
  const bordasValidas = draft.bordas.filter(b => b.nome.trim())
  const tamanhoNomeByLocalId = new Map(
    draft.tamanhos
      .filter(t => t.nome.trim() && t.ativo)
      .map(t => [t.localId, t.nome.trim()] as const)
  )

  const sabores = draft.sabores
    .filter(s => s.nome.trim())
    .map(sabor => {
      const precosTamanho = Object.entries(sabor.precosPorTamanhoLocalId)
        .filter(([, cfg]) => cfg.enabled && cfg.valor > 0)
        .map(([tamanhoLocalId, cfg]) => {
          const nomeTamanho = tamanhoNomeByLocalId.get(tamanhoLocalId)
          if (!nomeTamanho) return null
          return { nome: nomeTamanho, precoCheio: cfg.valor }
        })
        .filter((item): item is { nome: string; precoCheio: number } => item != null)

      return {
        nome: sabor.nome.trim(),
        descricao: sabor.descricao.trim() || null,
        ativo: sabor.ativo,
        precosTamanho,
      }
    })
    .filter(sabor => sabor.precosTamanho.length > 0)

  const complementos = draft.adicionais
    .filter(item => item.complementoId.trim())
    .map(item => {
      const precos = Object.entries(item.precosPorTamanhoLocalId)
        .filter(([, cfg]) => cfg.enabled)
        .map(([tamanhoLocalId, cfg]) => {
          const nomeTamanho = tamanhoNomeByLocalId.get(tamanhoLocalId)
          if (!nomeTamanho) return null
          return {
            nome: nomeTamanho,
            valor: Math.max(0, cfg.valor || 0),
          }
        })
        .filter((preco): preco is { nome: string; valor: number } => preco != null)

      return {
        complementoId: item.complementoId,
        ativo: item.ativo,
        precos,
      }
    })
    .filter(item => item.precos.length > 0)

  const mapComplemento = (item: PizzaLinhaComplementoDraft) => ({
    nome: item.nome.trim(),
    valor: item.valor,
    tipoImpactoPreco: 'aumenta' as TipoImpactoPreco,
    ativo: item.ativo,
  })

  return {
    nome: draft.nome.trim(),
    corHex: draft.corHex,
    iconName: draft.iconName,
    ativo: draft.ativo,
    impressorasIds: draft.impressorasIds,
    config: {
      menuId: options?.menuId ?? null,
      regraPrecoMultiplosSabores: draft.regraPrecoMultiplosSabores,
      imprimir: true,
      permiteDesconto: draft.permiteDesconto,
      permiteAcrescimo: draft.permiteAcrescimo,
      ativo: true,
    },
    tamanhos,
    sabores,
    complementos,
    gruposMassas:
      massasValidas.length > 0
        ? [
            {
              nome: 'Massas',
              obrigatorio: true,
              qtdMinima: 1,
              qtdMaxima: 1,
              ordem: 1,
              ativo: true,
              massas: massasValidas.map(mapComplemento),
            },
          ]
        : [],
    gruposBordas:
      bordasValidas.length > 0
        ? [
            {
              nome: 'Bordas',
              obrigatorio: true,
              qtdMinima: 1,
              qtdMaxima: 1,
              ordem: 1,
              ativo: true,
              bordas: bordasValidas.map(mapComplemento),
            },
          ]
        : [],
  }
}

export function serializePizzaDraft(draft: PizzaCategoriaDraft) {
  return JSON.stringify(draft)
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
