import type { RegraPrecoMultiplosSabores } from '@/src/shared/types/pizza'

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
  /** Presente quando o sabor já existe no backend (edição). */
  id?: string
  nome: string
  descricao: string
  ativo: boolean
  /** Precos indexados pelo localId do tamanho no draft. */
  precosPorTamanhoLocalId: Record<string, PizzaSaborPrecoDraft>
}

export type PizzaAdicionalDraft = {
  localId: string
  /** Id do vínculo complemento↔categoria quando já persistido. */
  vinculoId?: string
  complementoId: string
  ativo: boolean
  /** Precos indexados pelo localId do tamanho no draft. */
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
