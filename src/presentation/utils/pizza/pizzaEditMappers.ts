import type {
  CategoriaPizza,
  GrupoBordasPizza,
  GrupoMassasPizza,
  PizzaTamanho,
} from '@/src/shared/types/pizza'
import {
  createLocalId,
  type PizzaCategoriaDraft,
  type PizzaLinhaComplementoDraft,
  type PizzaTamanhoDraft,
} from '@/src/presentation/components/features/pizza/pizzaDefaults'

export type PizzaTamanhoEditDraft = PizzaTamanhoDraft & { id?: string }

export type PizzaLinhaComplementoEditDraft = PizzaLinhaComplementoDraft & { id?: string }

export type PizzaCategoriaEditDraft = Omit<
  PizzaCategoriaDraft,
  'tamanhos' | 'massas' | 'bordas'
> & {
  categoriaId: string
  grupoPizzaConfigId?: string
  grupoMassasId?: string
  grupoBordasId?: string
  tamanhos: PizzaTamanhoEditDraft[]
  massas: PizzaLinhaComplementoEditDraft[]
  bordas: PizzaLinhaComplementoEditDraft[]
  tamanhosRemovidosIds: string[]
  massasRemovidasIds: string[]
  bordasRemovidasIds: string[]
}

export function mapTamanhoToEditDraft(t: PizzaTamanho): PizzaTamanhoEditDraft {
  return {
    id: t.id,
    localId: createLocalId(),
    nome: t.nome,
    quantidadePedacos: t.quantidadePedacos,
    quantidadeMaximaDivisoes: t.quantidadeMaximaDivisoes,
    ativo: t.ativo,
  }
}

export function mapMassaToEditDraft(m: {
  id: string
  nome: string
  valor: number
  ativo: boolean
}): PizzaLinhaComplementoEditDraft {
  return {
    id: m.id,
    localId: createLocalId(),
    nome: m.nome,
    valor: m.valor,
    ativo: m.ativo,
  }
}

export function mapBordaToEditDraft(b: {
  id: string
  nome: string
  valor: number
  ativo: boolean
}): PizzaLinhaComplementoEditDraft {
  return {
    id: b.id,
    localId: createLocalId(),
    nome: b.nome,
    valor: b.valor,
    ativo: b.ativo,
  }
}

export function buildEditDraftFromLoaded(params: {
  categoria: CategoriaPizza
  tamanhos: PizzaTamanho[]
  grupoMassas?: GrupoMassasPizza | null
  grupoBordas?: GrupoBordasPizza | null
}): PizzaCategoriaEditDraft {
  const { categoria, tamanhos, grupoMassas, grupoBordas } = params

  return {
    categoriaId: categoria.id,
    grupoPizzaConfigId: tamanhos[0]?.grupoPizzaConfigId,
    grupoMassasId: grupoMassas?.id,
    grupoBordasId: grupoBordas?.id,
    nome: categoria.nome,
    corHex: categoria.corHex,
    iconName: categoria.iconName,
    ativo: categoria.ativo,
    regraPrecoMultiplosSabores: 'proporcional',
    tamanhos: tamanhos.map(mapTamanhoToEditDraft),
    massas: grupoMassas?.massas?.map(mapMassaToEditDraft) ?? [],
    bordas: grupoBordas?.bordas?.map(mapBordaToEditDraft) ?? [],
    tamanhosRemovidosIds: [],
    massasRemovidasIds: [],
    bordasRemovidasIds: [],
  }
}

export function serializePizzaEditDraft(draft: PizzaCategoriaEditDraft) {
  return JSON.stringify(draft)
}
