import { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import { Produto } from '@/src/domain/entities/Produto'
import { parseQuantidadeLimiteGrupo } from '@/src/domain/policies/pedido/GrupoComplementoLimitesPolicy'
import type {
  MenuGrupoProduto,
  MenuProduto,
  MenuProdutoComplementoItemResumo,
  MenuProdutoComplementoResumo,
} from '@/src/shared/types/menus'

export type ProdutoGrupoComplementoCatalogo = {
  id: string
  nome: string
  qtdMinima: number
  qtdMaxima: number
  limitesDoCadastro?: boolean
  complementos: MenuProdutoComplementoItemResumo[]
}

function asPlainRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function quantidadeLimiteInformadaNoJson(raw: unknown): boolean {
  if (raw == null || raw === '') return false
  if (typeof raw === 'number') return Number.isFinite(raw)
  if (typeof raw === 'string') return raw.trim() !== '' && Number.isFinite(Number(raw))
  return false
}

/** JSON cru infere pelos campos; flag explícita ganha (inclusive `false` do snapshot slim). */
export function grupoTemLimitesDeCadastro(grupo: {
  qtdMinima?: unknown
  qtdMaxima?: unknown
  limitesDoCadastro?: unknown
}): boolean {
  if (grupo.limitesDoCadastro === true) return true
  if (grupo.limitesDoCadastro === false) return false
  return (
    quantidadeLimiteInformadaNoJson(grupo.qtdMinima) ||
    quantidadeLimiteInformadaNoJson(grupo.qtdMaxima)
  )
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
): ProdutoGrupoComplementoCatalogo[] {
  if (!Array.isArray(grupos)) return []
  return grupos
    .map(grupo => {
      const id = grupo?.id != null ? String(grupo.id).trim() : ''
      if (!id) return null
      return {
        id,
        nome: grupo.nome?.trim() || 'Grupo',
        qtdMinima: parseQuantidadeLimiteGrupo(grupo.qtdMinima),
        qtdMaxima: parseQuantidadeLimiteGrupo(grupo.qtdMaxima),
        limitesDoCadastro: grupoTemLimitesDeCadastro(grupo),
        complementos: Array.isArray(grupo.complementos)
          ? grupo.complementos
              .map(mapComplementoResumo)
              .filter((item): item is MenuProdutoComplementoItemResumo => item != null)
          : [],
      }
    })
    .filter((grupo): grupo is ProdutoGrupoComplementoCatalogo => grupo != null)
}

export function gruposComplementosPrecisamHidratacao(
  grupos: Array<{ complementos?: readonly unknown[]; limitesDoCadastro?: boolean }>
): boolean {
  return grupos.some(
    grupo => (grupo.complementos?.length ?? 0) === 0 || grupo.limitesDoCadastro !== true
  )
}

export function mapGrupoComplementoJsonToProdutoGrupo(
  raw: unknown
): ProdutoGrupoComplementoCatalogo | null {
  const root = asPlainRecord(raw)
  const nested = asPlainRecord(root.data)
  const rec = nested.id != null || nested.nome != null ? nested : root
  const id = rec.id != null ? String(rec.id).trim() : ''
  if (!id) return null
  return {
    id,
    nome: rec.nome != null ? String(rec.nome).trim() || 'Grupo' : 'Grupo',
    qtdMinima: parseQuantidadeLimiteGrupo(rec.qtdMinima),
    qtdMaxima: parseQuantidadeLimiteGrupo(rec.qtdMaxima),
    limitesDoCadastro: true,
    complementos: Array.isArray(rec.complementos)
      ? rec.complementos
          .map(mapComplementoResumo)
          .filter((item): item is MenuProdutoComplementoItemResumo => item != null)
      : [],
  }
}

/**
 * Reaproveita itens e limites do cadastro do produto quando o snapshot do menu
 * só trouxe id/nome — evita um GET extra por grupo na primeira abertura.
 */
export function mesclarGrupoComplementoMenuComCadastro(
  grupoMenu: ProdutoGrupoComplementoCatalogo,
  grupoCadastro: ProdutoGrupoComplementoCatalogo | undefined
): ProdutoGrupoComplementoCatalogo {
  if (!gruposComplementosPrecisamHidratacao([grupoMenu])) return grupoMenu
  if (!grupoCadastro) return grupoMenu

  const complementos =
    grupoMenu.complementos.length > 0 ? grupoMenu.complementos : grupoCadastro.complementos
  const limitesDoCadastro =
    grupoMenu.limitesDoCadastro === true || grupoCadastro.limitesDoCadastro === true

  return {
    id: grupoMenu.id,
    nome: grupoMenu.nome || grupoCadastro.nome,
    qtdMinima: grupoMenu.limitesDoCadastro === true ? grupoMenu.qtdMinima : grupoCadastro.qtdMinima,
    qtdMaxima: grupoMenu.limitesDoCadastro === true ? grupoMenu.qtdMaxima : grupoCadastro.qtdMaxima,
    limitesDoCadastro,
    complementos,
  }
}

export function gruposProdutoParaCatalogo(
  produto: Pick<Produto, 'getGruposComplementos'>
): ProdutoGrupoComplementoCatalogo[] {
  return produto.getGruposComplementos().map(grupo => ({
    id: grupo.id,
    nome: grupo.nome,
    qtdMinima: grupo.qtdMinima ?? 0,
    qtdMaxima: grupo.qtdMaxima ?? 0,
    limitesDoCadastro: grupo.limitesDoCadastro === true,
    complementos: [...(grupo.complementos ?? [])],
  }))
}

export function substituirGruposComplementosDoProduto(
  produto: Produto,
  grupos: ProdutoGrupoComplementoCatalogo[]
): Produto {
  return Produto.fromJSON({
    ...produto.toJSON(),
    gruposComplementos: grupos,
  })
}

export type FontesHidratacaoGrupoComplemento = {
  cadastroPorId?: Map<string, ProdutoGrupoComplementoCatalogo>
  cachePorId?: Map<string, ProdutoGrupoComplementoCatalogo>
}

/**
 * Completa itens e limites dos grupos do menu: cadastro → cache → GET opcional.
 * Não troca a lista de grupos do cardápio.
 */
export async function hidratarGruposComplementosComFontes(
  produto: Produto,
  fontes: FontesHidratacaoGrupoComplemento,
  buscarGrupo?: (id: string) => Promise<ProdutoGrupoComplementoCatalogo | null>
): Promise<{ produto: Produto; gruposCompletos: ProdutoGrupoComplementoCatalogo[] }> {
  const grupos = gruposProdutoParaCatalogo(produto)
  if (grupos.length === 0) {
    return { produto, gruposCompletos: [] }
  }

  if (!gruposComplementosPrecisamHidratacao(grupos)) {
    return { produto, gruposCompletos: grupos }
  }

  const gruposCompletos: ProdutoGrupoComplementoCatalogo[] = []

  const hidratados = await Promise.all(
    grupos.map(async grupo => {
      let atual = mesclarGrupoComplementoMenuComCadastro(
        grupo,
        fontes.cadastroPorId?.get(grupo.id)
      )
      if (!gruposComplementosPrecisamHidratacao([atual])) {
        gruposCompletos.push(atual)
        return atual
      }

      atual = mesclarGrupoComplementoMenuComCadastro(atual, fontes.cachePorId?.get(grupo.id))
      if (!gruposComplementosPrecisamHidratacao([atual])) {
        gruposCompletos.push(atual)
        return atual
      }

      if (!buscarGrupo) return atual
      const fetched = await buscarGrupo(grupo.id)
      if (!fetched) return atual

      const mescladoFetch: ProdutoGrupoComplementoCatalogo = {
        ...fetched,
        nome: atual.nome || fetched.nome,
        complementos:
          atual.complementos.length > 0 ? atual.complementos : fetched.complementos,
      }
      if (!gruposComplementosPrecisamHidratacao([mescladoFetch])) {
        gruposCompletos.push(mescladoFetch)
      }
      return mescladoFetch
    })
  )

  return {
    produto: substituirGruposComplementosDoProduto(produto, hidratados),
    gruposCompletos,
  }
}

function abreComplementosDoSnapshot(
  snapshot: MenuProduto,
  gruposMenu: ProdutoGrupoComplementoCatalogo[]
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
