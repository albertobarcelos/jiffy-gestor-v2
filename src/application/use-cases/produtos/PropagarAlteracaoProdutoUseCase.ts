import { Produto } from '@/src/domain/entities/Produto'
import { fetchBffDelete, fetchBffJson, fetchBffVoid } from '@/src/infrastructure/api/bffClient'
import type { UpdateMenuProdutoInput } from '@/src/shared/types/menus'
import type {
  MenuAlvoPropagacao,
  SnapshotProdutoPropagavel,
} from '@/src/shared/types/propagarAlteracaoProduto'

/** Campos aceitos tanto no PATCH do produto-base quanto no PATCH do MenuProduto. */
function camposCompartilhados(
  snapshot: SnapshotProdutoPropagavel
): SnapshotProdutoPropagavel {
  const out: SnapshotProdutoPropagavel = {}
  if (typeof snapshot.nome === 'string' && snapshot.nome.trim() !== '') {
    out.nome = snapshot.nome.trim()
  }
  if ('descricao' in snapshot) {
    out.descricao = snapshot.descricao ?? null
  }
  if (typeof snapshot.valor === 'number' && Number.isFinite(snapshot.valor) && snapshot.valor > 0) {
    out.valor = snapshot.valor
  }
  if (typeof snapshot.ativo === 'boolean') out.ativo = snapshot.ativo
  if (typeof snapshot.favorito === 'boolean') out.favorito = snapshot.favorito
  return out
}

function patchMenuProduto(snapshot: SnapshotProdutoPropagavel): UpdateMenuProdutoInput {
  const compartilhado = camposCompartilhados(snapshot)
  const out: UpdateMenuProdutoInput = {}
  if (compartilhado.nome !== undefined) out.nome = compartilhado.nome
  if ('descricao' in compartilhado) out.descricao = compartilhado.descricao
  if (compartilhado.valor !== undefined) out.valor = compartilhado.valor
  if (compartilhado.ativo !== undefined) out.ativo = compartilhado.ativo
  if (compartilhado.favorito !== undefined) out.favorito = compartilhado.favorito
  if (typeof snapshot.valorPromocional === 'number' && Number.isFinite(snapshot.valorPromocional)) {
    out.valorPromocional = Math.max(0, snapshot.valorPromocional)
  }
  if (typeof snapshot.promocaoAtiva === 'boolean') out.promocaoAtiva = snapshot.promocaoAtiva
  if (snapshot.grupoProdutoId) out.grupoProdutoId = snapshot.grupoProdutoId
  if (snapshot.gruposComplementosIds !== undefined) {
    out.gruposComplementosIds = snapshot.gruposComplementosIds
  }
  return out
}

function patchCadastroBase(snapshot: SnapshotProdutoPropagavel): Record<string, unknown> {
  const out: Record<string, unknown> = { ...camposCompartilhados(snapshot) }
  if (snapshot.grupoProdutoId) out.grupoId = snapshot.grupoProdutoId
  if (snapshot.gruposComplementosIds && snapshot.gruposComplementosIds.length > 0) {
    out.gruposComplementosIds = snapshot.gruposComplementosIds
  }
  return out
}

function payloadProduto(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object') return {}
  const rec = data as { data?: unknown }
  if (rec.data && typeof rec.data === 'object' && !Array.isArray(rec.data)) {
    return rec.data as Record<string, unknown>
  }
  return rec as Record<string, unknown>
}

export class PropagarAlteracaoProdutoUseCase {
  async listarMenusDoProduto(params: {
    produtoId: string
    token: string
  }): Promise<MenuAlvoPropagacao[]> {
    const data = await fetchBffJson<{ data?: unknown }>(
      `/api/produtos/${encodeURIComponent(params.produtoId)}`,
      params.token
    )
    const payload = data?.data && typeof data.data === 'object' ? data.data : data
    return Produto.fromJSON(payload).getMenus()
  }

  async aplicarAlteracaoProdutoNosDestinos(params: {
    produtoId: string
    token: string
    snapshot: SnapshotProdutoPropagavel
    aplicarNoCadastroBase: boolean
    menuIds: string[]
  }): Promise<void> {
    const { produtoId, token, aplicarNoCadastroBase, menuIds } = params
    const compartilhado = camposCompartilhados(params.snapshot)
    const menuPatch = patchMenuProduto(params.snapshot)
    const basePatch = patchCadastroBase(params.snapshot)
    const limparGruposCadastro =
      aplicarNoCadastroBase && params.snapshot.gruposComplementosIds?.length === 0

    if (
      Object.keys(compartilhado).length === 0 &&
      !params.snapshot.grupoProdutoId &&
      params.snapshot.gruposComplementosIds === undefined &&
      params.snapshot.valorPromocional === undefined &&
      params.snapshot.promocaoAtiva === undefined &&
      !limparGruposCadastro
    ) {
      return
    }

    if (aplicarNoCadastroBase && Object.keys(basePatch).length > 0) {
      await fetchBffVoid(`/api/produtos/${encodeURIComponent(produtoId)}`, token, {
        method: 'PATCH',
        body: JSON.stringify(basePatch),
      })
    }

    if (limparGruposCadastro) {
      await limparGruposComplementosDoCadastro(produtoId, token)
    }

    if (Object.keys(menuPatch).length === 0) return

    const ids = [...new Set(menuIds.filter(Boolean))]
    if (ids.length === 0) return

    await fetchBffVoid(`/api/produtos/${encodeURIComponent(produtoId)}/menus`, token, {
      method: 'PATCH',
      body: JSON.stringify({ add: ids }),
    })

    for (const menuId of ids) {
      await fetchBffVoid(
        `/api/menus/${encodeURIComponent(menuId)}/produtos/${encodeURIComponent(produtoId)}`,
        token,
        {
          method: 'PATCH',
          body: JSON.stringify(menuPatch),
        }
      )
    }
  }
}

/** A API ignora PATCH com `gruposComplementosIds: []`. Remove cada vínculo do cadastro. */
async function limparGruposComplementosDoCadastro(produtoId: string, token: string): Promise<void> {
  const data = await fetchBffJson<unknown>(
    `/api/produtos/${encodeURIComponent(produtoId)}`,
    token
  )
  const produto = Produto.fromJSON(payloadProduto(data))
  const ids = produto.getGruposComplementos().map(grupo => grupo.id).filter(Boolean)
  for (const grupoId of ids) {
    await fetchBffDelete(
      `/api/produtos/${encodeURIComponent(produtoId)}/grupos-complementos/${encodeURIComponent(grupoId)}`,
      token
    )
  }
}

export const propagarAlteracaoProdutoUseCase = new PropagarAlteracaoProdutoUseCase()

export async function listarMenusDoProduto(params: {
  produtoId: string
  token: string
}): Promise<MenuAlvoPropagacao[]> {
  return propagarAlteracaoProdutoUseCase.listarMenusDoProduto(params)
}

export async function aplicarAlteracaoProdutoNosDestinos(params: {
  produtoId: string
  token: string
  snapshot: SnapshotProdutoPropagavel
  aplicarNoCadastroBase: boolean
  menuIds: string[]
}): Promise<void> {
  return propagarAlteracaoProdutoUseCase.aplicarAlteracaoProdutoNosDestinos(params)
}
