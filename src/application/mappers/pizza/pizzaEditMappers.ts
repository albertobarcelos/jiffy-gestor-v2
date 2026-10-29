import type {
  CategoriaPizza,
  GrupoBordasPizza,
  GrupoMassasPizza,
  PizzaTamanho,
  UpdateCategoriaPizzaInput,
} from '@/src/shared/types/pizza'
import type {
  PizzaCategoriaDraft,
  PizzaLinhaComplementoDraft,
  PizzaTamanhoDraft,
} from '@/src/application/dto/pizza/pizzaDraftTypes'
import { CategoriaPizza as CategoriaPizzaEntity } from '@/src/domain/entities/pizza/CategoriaPizza'

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

function createEditLocalId(prefix: string, id?: string) {
  return id ? `${prefix}-${id}` : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function mapTamanhoToEditDraft(t: PizzaTamanho): PizzaTamanhoEditDraft {
  return {
    id: t.id,
    localId: createEditLocalId('tamanho', t.id),
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
    localId: createEditLocalId('massa', m.id),
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
    localId: createEditLocalId('borda', b.id),
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
  const categoriaEntity = CategoriaPizzaEntity.fromDatabase(categoria)

  return {
    categoriaId: categoriaEntity.getId(),
    grupoPizzaConfigId: tamanhos[0]?.grupoPizzaConfigId,
    grupoMassasId: grupoMassas?.id,
    grupoBordasId: grupoBordas?.id,
    nome: categoriaEntity.getNome(),
    corHex: categoriaEntity.getCorHex(),
    iconName: categoriaEntity.getIconName(),
    ativo: categoriaEntity.isAtivo(),
    regraPrecoMultiplosSabores: categoriaEntity.getRegraPrecoMultiplosSabores(),
    permiteDesconto: categoriaEntity.permiteDescontoAtivo(),
    permiteAcrescimo: categoriaEntity.permiteAcrescimoAtivo(),
    impressorasIds: [],
    tamanhos: tamanhos.map(mapTamanhoToEditDraft),
    sabores: [],
    adicionais: [],
    massas: grupoMassas?.massas?.map(mapMassaToEditDraft) ?? [],
    bordas: grupoBordas?.bordas?.map(mapBordaToEditDraft) ?? [],
    tamanhosRemovidosIds: [],
    massasRemovidasIds: [],
    bordasRemovidasIds: [],
  }
}

export function buildUpdateCategoriaPizzaInput(
  draft: PizzaCategoriaEditDraft
): UpdateCategoriaPizzaInput {
  return {
    nome: draft.nome.trim(),
    corHex: draft.corHex,
    iconName: draft.iconName,
    ativo: draft.ativo,
    regraPrecoMultiplosSabores: draft.regraPrecoMultiplosSabores,
    permiteDesconto: draft.permiteDesconto,
    permiteAcrescimo: draft.permiteAcrescimo,
  }
}

export function serializePizzaEditDraft(draft: PizzaCategoriaEditDraft) {
  return JSON.stringify(draft)
}
