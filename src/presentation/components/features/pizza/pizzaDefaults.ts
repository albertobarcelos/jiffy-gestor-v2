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

export type PizzaCategoriaDraft = {
  nome: string
  corHex: string
  iconName: string
  ativo: boolean
  regraPrecoMultiplosSabores: RegraPrecoMultiplosSabores
  tamanhos: PizzaTamanhoDraft[]
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
    tamanhos: DEFAULT_TAMANHOS.map(t => ({ ...t, localId: createLocalId() })),
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

export function buildCreateCompletoPayload(draft: PizzaCategoriaDraft): CreateCategoriaPizzaCompletoInput {
  const tamanhos = draft.tamanhos
    .filter(t => t.nome.trim() && t.ativo)
    .map(t => ({
      nome: t.nome.trim(),
      quantidadePedacos: t.quantidadePedacos,
      quantidadeMaximaDivisoes: t.quantidadeMaximaDivisoes,
      ativo: t.ativo,
    }))

  const massasValidas = draft.massas.filter(m => m.nome.trim())
  const bordasValidas = draft.bordas.filter(b => b.nome.trim())

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
    config: {
      regraPrecoMultiplosSabores: draft.regraPrecoMultiplosSabores,
      imprimir: true,
      permiteDesconto: true,
      permiteAcrescimo: true,
      ativo: true,
    },
    tamanhos,
    sabores: [],
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
