import { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import { Produto } from '@/src/domain/entities/Produto'
import type {
  MenuGrupoProduto,
  MenuProduto,
  MenuProdutoComplementoItemResumo,
  MenuProdutoComplementoResumo,
} from '@/src/shared/types/menus'

type ProdutoGrupoComplemento = {
  id: string
  nome: string
  complementos: MenuProdutoComplementoItemResumo[]
}

function asPlainRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function mapComplementoResumo(raw: unknown): MenuProdutoComplementoItemResumo | null {
  const rec = asPlainRecord(raw)
  const id = rec.id != null ? String(rec.id).trim() : ''
  const nome = rec.nome != null ? String(rec.nome).trim() : ''
  if (!id) return null
  const valor =
    typeof rec.valor === 'number' ? rec.valor : rec.valor != null ? Number(rec.valor) || 0 : 0
  const tipo = rec.tipoImpactoPreco
  return {
    id,
    nome: nome || 'Complemento',
    valor,
    tipoImpactoPreco:
      tipo === 'aumenta' || tipo === 'diminui' || tipo === 'nenhum' ? tipo : 'nenhum',
  }
}

export function mapMenuGruposComplementosToProduto(
  grupos: MenuProdutoComplementoResumo[] | undefined
): ProdutoGrupoComplemento[] {
  if (!Array.isArray(grupos)) return []
  return grupos
    .map(grupo => {
      const id = grupo?.id != null ? String(grupo.id).trim() : ''
      if (!id) return null
      return {
        id,
        nome: grupo.nome?.trim() || 'Grupo',
        complementos: Array.isArray(grupo.complementos)
          ? grupo.complementos.map(mapComplementoResumo).filter((item): item is MenuProdutoComplementoItemResumo => item != null)
          : [],
      }
    })
    .filter((grupo): grupo is ProdutoGrupoComplemento => grupo != null)
}

export function gruposComplementosPrecisamHidratacao(
  grupos: Array<{ complementos?: readonly unknown[] }>
): boolean {
  return grupos.some(grupo => (grupo.complementos?.length ?? 0) === 0)
}

export function mapGrupoComplementoJsonToProdutoGrupo(raw: unknown): ProdutoGrupoComplemento | null {
  const root = asPlainRecord(raw)
  const nested = asPlainRecord(root.data)
  const rec = nested.id != null || nested.nome != null ? nested : root
  const id = rec.id != null ? String(rec.id).trim() : ''
  if (!id) return null
  return {
    id,
    nome: rec.nome != null ? String(rec.nome).trim() || 'Grupo' : 'Grupo',
    complementos: Array.isArray(rec.complementos)
      ? rec.complementos
          .map(mapComplementoResumo)
          .filter((item): item is MenuProdutoComplementoItemResumo => item != null)
      : [],
  }
}

export function substituirGruposComplementosDoProduto(
  produto: Produto,
  grupos: ProdutoGrupoComplemento[]
): Produto {
  return Produto.fromJSON({
    ...produto.toJSON(),
    gruposComplementos: grupos,
  })
}

function abreComplementosDoSnapshot(
  snapshot: MenuProduto,
  gruposMenu: ProdutoGrupoComplemento[]
): boolean {
  if (typeof snapshot.abreComplementos === 'boolean') return snapshot.abreComplementos
  return gruposMenu.length > 0
}

export function menuGrupoProdutoToGrupoProduto(item: MenuGrupoProduto): GrupoProduto {
  const base = item.grupoBase
  return GrupoProduto.create({
    id: base.id,
    nome: item.nome?.trim() || base.nome || 'Categoria',
    corHex: base.corHex?.trim() || '#CCCCCC',
    iconName: base.iconName?.trim() || '',
    ativo: base.ativo ?? true,
    ativoDelivery: true,
    ativoLocal: true,
    ordem: typeof item.ordem === 'number' ? item.ordem : base.ordem,
    imagemUrl: base.imagemUrl ?? item.image?.imageUrl ?? null,
  })
}

/**
 * Snapshot do produto neste cardápio.
 * Complementos vêm só dos grupos vinculados ao produto do menu — nunca do cadastro base.
 */
export function menuProdutoToProduto(snapshot: MenuProduto, base?: Produto | null): Produto {
  if (base) {
    return mergeProdutoComSnapshotMenu(base, snapshot)
  }

  const produtoId = snapshot.produtoId?.trim() || snapshot.id
  const grupoId = snapshot.grupoProduto?.id?.trim()
  const grupoNome = snapshot.grupoProduto?.nome?.trim()
  const gruposMenu = mapMenuGruposComplementosToProduto(snapshot.gruposComplementos)

  return Produto.create(
    produtoId,
    '',
    snapshot.nome?.trim() || 'Produto',
    typeof snapshot.valor === 'number' ? snapshot.valor : 0,
    snapshot.ativo !== false,
    snapshot.descricao ?? undefined,
    grupoNome,
    grupoId,
    undefined,
    snapshot.favorito === true,
    abreComplementosDoSnapshot(snapshot, gruposMenu),
    snapshot.permiteAcrescimo === true,
    snapshot.permiteDesconto === true,
    snapshot.permiteAlterarPreco === true,
    snapshot.incideTaxa === true,
    true,
    true,
    typeof snapshot.ordem === 'number' ? snapshot.ordem : undefined,
    gruposMenu,
    [],
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    'UN',
    undefined,
    snapshot.image?.imageUrl ?? null
  )
}

export function mergeProdutoComSnapshotMenu(base: Produto, snapshot: MenuProduto): Produto {
  const grupoId = snapshot.grupoProduto?.id?.trim() || base.getGrupoId()
  const grupoNome = snapshot.grupoProduto?.nome?.trim() || base.getNomeGrupo()
  const gruposMenu = mapMenuGruposComplementosToProduto(snapshot.gruposComplementos)

  return Produto.create(
    base.getId(),
    base.getCodigoProduto(),
    snapshot.nome?.trim() || base.getNome(),
    typeof snapshot.valor === 'number' ? snapshot.valor : base.getValor(),
    snapshot.ativo !== false,
    snapshot.descricao ?? base.getDescricao(),
    grupoNome,
    grupoId,
    base.getEstoque(),
    snapshot.favorito ?? base.isFavorito(),
    abreComplementosDoSnapshot(snapshot, gruposMenu),
    snapshot.permiteAcrescimo ?? base.permiteAcrescimoAtivo(),
    snapshot.permiteDesconto ?? base.permiteDescontoAtivo(),
    snapshot.permiteAlterarPreco ?? base.permiteAlterarPrecoAtivo(),
    snapshot.incideTaxa ?? base.incideTaxaAtivo(),
    base.isAtivoDelivery(),
    base.isAtivoLocal(),
    typeof snapshot.ordem === 'number' ? snapshot.ordem : base.getOrdem(),
    gruposMenu,
    base.getImpressoras(),
    base.getNcm(),
    base.getCest(),
    base.getOrigemMercadoria(),
    base.getTipoProduto(),
    base.getIndicadorProducaoEscala(),
    base.getUnidadeMedida(),
    base.getMenus(),
    snapshot.image?.imageUrl ?? base.getImagemUrl()
  )
}

export function unwrapMenuProdutoPayload(raw: unknown): MenuProduto | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const data = obj.data && typeof obj.data === 'object' ? obj.data : obj
  if (!data || typeof data !== 'object') return null
  const item = data as MenuProduto
  if (!item.produtoId && !item.id) return null
  return item
}
