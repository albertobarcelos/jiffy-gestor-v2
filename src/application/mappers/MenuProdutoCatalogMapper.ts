import { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import { Produto } from '@/src/domain/entities/Produto'
import type { MenuGrupoProduto, MenuProduto } from '@/src/shared/types/menus'

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

/** Snapshot leve para grade do catálogo (complementos completos vêm do cadastro base no lazy load). */
export function menuProdutoToProduto(snapshot: MenuProduto, base?: Produto | null): Produto {
  const produtoId = snapshot.produtoId?.trim() || snapshot.id
  const grupoId = snapshot.grupoProduto?.id?.trim()
  const grupoNome = snapshot.grupoProduto?.nome?.trim()

  if (base) {
    return mergeProdutoComSnapshotMenu(base, snapshot)
  }

  const temComplementosResumo = (snapshot.gruposComplementos?.length ?? 0) > 0

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
    temComplementosResumo,
    false,
    false,
    false,
    false,
    true,
    true,
    typeof snapshot.ordem === 'number' ? snapshot.ordem : undefined,
    [],
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
    base.abreComplementosAtivo(),
    base.permiteAcrescimoAtivo(),
    base.permiteDescontoAtivo(),
    base.permiteAlterarPrecoAtivo(),
    base.incideTaxaAtivo(),
    base.isAtivoDelivery(),
    base.isAtivoLocal(),
    typeof snapshot.ordem === 'number' ? snapshot.ordem : base.getOrdem(),
    base.getGruposComplementos(),
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
