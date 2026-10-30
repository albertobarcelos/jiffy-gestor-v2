import type {
  CategoriaPizza,
  ComplementoPizza,
  GrupoBordasPizza,
  GrupoMassasPizza,
  PizzaTamanho,
  SaborPizza,
  UpdateCategoriaPizzaInput,
} from '@/src/shared/types/pizza'
import type {
  PizzaAdicionalDraft,
  PizzaCategoriaDraft,
  PizzaLinhaComplementoDraft,
  PizzaSaborDraft,
  PizzaSaborPrecoDraft,
  PizzaTamanhoDraft,
} from '@/src/application/dto/pizza/pizzaDraftTypes'
import { CategoriaPizza as CategoriaPizzaEntity } from '@/src/domain/entities/pizza/CategoriaPizza'

export type PizzaTamanhoEditDraft = PizzaTamanhoDraft & { id?: string }

export type PizzaLinhaComplementoEditDraft = PizzaLinhaComplementoDraft & { id?: string }

export type PizzaSaborEditDraft = PizzaSaborDraft & { id?: string }

export type PizzaAdicionalEditDraft = PizzaAdicionalDraft & { vinculoId?: string }

export type PizzaCategoriaEditDraft = Omit<
  PizzaCategoriaDraft,
  'tamanhos' | 'massas' | 'bordas' | 'sabores' | 'adicionais'
> & {
  categoriaId: string
  grupoPizzaConfigId?: string
  grupoMassasId?: string
  grupoBordasId?: string
  tamanhos: PizzaTamanhoEditDraft[]
  massas: PizzaLinhaComplementoEditDraft[]
  bordas: PizzaLinhaComplementoEditDraft[]
  sabores: PizzaSaborEditDraft[]
  adicionais: PizzaAdicionalEditDraft[]
  tamanhosRemovidosIds: string[]
  massasRemovidasIds: string[]
  bordasRemovidasIds: string[]
  saboresRemovidosIds: string[]
  adicionaisRemovidosVinculoIds: string[]
}

export function createEditLocalId(prefix: string, id?: string) {
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

function precosSaborParaDraft(
  precos: Array<{ pizzaTamanhoId: string; precoCheio: number }>,
  tamanhoLocalIdByServerId: Map<string, string>
): Record<string, PizzaSaborPrecoDraft> {
  const result: Record<string, PizzaSaborPrecoDraft> = {}
  for (const preco of precos) {
    const localId = tamanhoLocalIdByServerId.get(preco.pizzaTamanhoId)
    if (!localId) continue
    result[localId] = { enabled: true, valor: preco.precoCheio }
  }
  return result
}

function precosComplementoParaDraft(
  precos: Array<{ pizzaTamanhoId: string; valor: number }>,
  tamanhoLocalIdByServerId: Map<string, string>
): Record<string, PizzaSaborPrecoDraft> {
  const result: Record<string, PizzaSaborPrecoDraft> = {}
  for (const preco of precos) {
    const localId = tamanhoLocalIdByServerId.get(preco.pizzaTamanhoId)
    if (!localId) continue
    result[localId] = { enabled: true, valor: preco.valor }
  }
  return result
}

export function mapSaborToEditDraft(
  sabor: SaborPizza,
  tamanhoLocalIdByServerId: Map<string, string>
): PizzaSaborEditDraft {
  return {
    id: sabor.id,
    localId: createEditLocalId('sabor', sabor.id),
    nome: sabor.nome,
    descricao: sabor.descricao ?? '',
    ativo: sabor.ativo,
    precosPorTamanhoLocalId: precosSaborParaDraft(sabor.precosTamanho ?? [], tamanhoLocalIdByServerId),
  }
}

export function mapComplementoToEditDraft(
  complemento: ComplementoPizza,
  tamanhoLocalIdByServerId: Map<string, string>
): PizzaAdicionalEditDraft {
  return {
    vinculoId: complemento.id,
    localId: createEditLocalId('adicional', complemento.id),
    complementoId: complemento.complementoId,
    ativo: complemento.ativo,
    precosPorTamanhoLocalId: precosComplementoParaDraft(
      complemento.precos ?? [],
      tamanhoLocalIdByServerId
    ),
  }
}

export function buildEditDraftFromLoaded(params: {
  categoria: CategoriaPizza
  tamanhos: PizzaTamanho[]
  grupoMassas?: GrupoMassasPizza | null
  grupoBordas?: GrupoBordasPizza | null
  sabores?: SaborPizza[]
  complementos?: ComplementoPizza[]
}): PizzaCategoriaEditDraft {
  const { categoria, tamanhos, grupoMassas, grupoBordas, sabores = [], complementos = [] } = params
  const categoriaEntity = CategoriaPizzaEntity.fromDatabase(categoria)
  const tamanhosDraft = tamanhos.map(mapTamanhoToEditDraft)
  const tamanhoLocalIdByServerId = new Map(
    tamanhosDraft.filter(t => t.id).map(t => [t.id!, t.localId] as const)
  )

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
    impressorasIds: [...(categoria.impressorasIds ?? [])],
    tamanhos: tamanhosDraft,
    sabores: sabores.map(s => mapSaborToEditDraft(s, tamanhoLocalIdByServerId)),
    adicionais: complementos.map(c => mapComplementoToEditDraft(c, tamanhoLocalIdByServerId)),
    massas: grupoMassas?.massas?.map(mapMassaToEditDraft) ?? [],
    bordas: grupoBordas?.bordas?.map(mapBordaToEditDraft) ?? [],
    tamanhosRemovidosIds: [],
    massasRemovidasIds: [],
    bordasRemovidasIds: [],
    saboresRemovidosIds: [],
    adicionaisRemovidosVinculoIds: [],
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
    impressorasIds: [...draft.impressorasIds],
  }
}

export function serializePizzaEditDraft(draft: PizzaCategoriaEditDraft) {
  return JSON.stringify(draft)
}

/** Mescla mudança vinda dos steps (tipo create) preservando metadados de edição. */
export function mergeEditDraftFromStepChange(
  prev: PizzaCategoriaEditDraft,
  next: PizzaCategoriaDraft
): PizzaCategoriaEditDraft {
  const removedSaborIds = prev.sabores
    .filter(s => s.id && !next.sabores.some(n => n.localId === s.localId))
    .map(s => s.id!)
  const removedAdicionalIds = prev.adicionais
    .filter(a => a.vinculoId && !next.adicionais.some(n => n.localId === a.localId))
    .map(a => a.vinculoId!)
  const removedTamanhoIds = prev.tamanhos
    .filter(t => t.id && !next.tamanhos.some(n => n.localId === t.localId))
    .map(t => t.id!)
  const removedMassaIds = prev.massas
    .filter(m => m.id && !next.massas.some(n => n.localId === m.localId))
    .map(m => m.id!)
  const removedBordaIds = prev.bordas
    .filter(b => b.id && !next.bordas.some(n => n.localId === b.localId))
    .map(b => b.id!)

  const prevSaborByLocal = new Map(prev.sabores.map(s => [s.localId, s]))
  const prevAdicionalByLocal = new Map(prev.adicionais.map(a => [a.localId, a]))
  const prevTamanhoByLocal = new Map(prev.tamanhos.map(t => [t.localId, t]))
  const prevMassaByLocal = new Map(prev.massas.map(m => [m.localId, m]))
  const prevBordaByLocal = new Map(prev.bordas.map(b => [b.localId, b]))

  return {
    ...prev,
    ...next,
    tamanhos: next.tamanhos.map(t => ({
      ...t,
      id: prevTamanhoByLocal.get(t.localId)?.id,
    })),
    massas: next.massas.map(m => ({
      ...m,
      id: prevMassaByLocal.get(m.localId)?.id,
    })),
    bordas: next.bordas.map(b => ({
      ...b,
      id: prevBordaByLocal.get(b.localId)?.id,
    })),
    sabores: next.sabores.map(s => ({
      ...s,
      id: s.id ?? prevSaborByLocal.get(s.localId)?.id,
    })),
    adicionais: next.adicionais.map(a => ({
      ...a,
      vinculoId: a.vinculoId ?? prevAdicionalByLocal.get(a.localId)?.vinculoId,
    })),
    tamanhosRemovidosIds: [...new Set([...prev.tamanhosRemovidosIds, ...removedTamanhoIds])],
    massasRemovidasIds: [...new Set([...prev.massasRemovidasIds, ...removedMassaIds])],
    bordasRemovidasIds: [...new Set([...prev.bordasRemovidasIds, ...removedBordaIds])],
    saboresRemovidosIds: [...new Set([...prev.saboresRemovidosIds, ...removedSaborIds])],
    adicionaisRemovidosVinculoIds: [
      ...new Set([...prev.adicionaisRemovidosVinculoIds, ...removedAdicionalIds]),
    ],
  }
}
