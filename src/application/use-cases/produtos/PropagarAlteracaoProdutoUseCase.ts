import { Produto } from '@/src/domain/entities/Produto'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import type { UpdateMenuProdutoInput } from '@/src/shared/types/menus'
import type {
  MenuAlvoPropagacao,
  SnapshotProdutoPropagavel,
} from '@/src/shared/types/propagarAlteracaoProduto'

/**
 * Orquestra só rotas que o BFF/backend já expõem:
 * - GET  /api/produtos/:id
 * - PATCH /api/produtos/:id
 * - PATCH /api/menus/:menuId/produtos/:produtoId
 */

async function parseError(response: Response, fallback: string): Promise<never> {
  const errorData = await response.json().catch(() => ({}))
  throw new Error((errorData as { message?: string }).message || fallback)
}

function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

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
  if (snapshot.grupoProdutoId) out.grupoProdutoId = snapshot.grupoProdutoId
  if (snapshot.gruposComplementosIds !== undefined) {
    out.gruposComplementosIds = snapshot.gruposComplementosIds
  }
  return out
}

function patchCadastroBase(snapshot: SnapshotProdutoPropagavel): Record<string, unknown> {
  const out: Record<string, unknown> = { ...camposCompartilhados(snapshot) }
  if (snapshot.grupoProdutoId) out.grupoId = snapshot.grupoProdutoId
  if (snapshot.gruposComplementosIds !== undefined) {
    out.gruposComplementosIds = snapshot.gruposComplementosIds
  }
  return out
}

export async function listarMenusDoProduto(params: {
  produtoId: string
  token: string
}): Promise<MenuAlvoPropagacao[]> {
  const response = await fetchGestorApi(`/api/produtos/${params.produtoId}`, {
    headers: authHeaders(params.token),
  })
  if (!response.ok) await parseError(response, 'Erro ao carregar menus do produto')
  const data = await response.json()
  const payload = data?.data && typeof data.data === 'object' ? data.data : data
  return Produto.fromJSON(payload).getMenus()
}

export async function aplicarAlteracaoProdutoNosDestinos(params: {
  produtoId: string
  token: string
  snapshot: SnapshotProdutoPropagavel
  aplicarNoCadastroBase: boolean
  menuIds: string[]
}): Promise<void> {
  const { produtoId, token, aplicarNoCadastroBase, menuIds } = params
  const headers = authHeaders(token)
  const compartilhado = camposCompartilhados(params.snapshot)
  const menuPatch = patchMenuProduto(params.snapshot)
  const basePatch = patchCadastroBase(params.snapshot)

  if (
    Object.keys(compartilhado).length === 0 &&
    !params.snapshot.grupoProdutoId &&
    params.snapshot.gruposComplementosIds === undefined
  ) {
    return
  }

  if (aplicarNoCadastroBase && Object.keys(basePatch).length > 0) {
    const response = await fetchGestorApi(`/api/produtos/${produtoId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(basePatch),
    })
    if (!response.ok) await parseError(response, 'Erro ao atualizar o cadastro base')
  }

  if (Object.keys(menuPatch).length === 0) return

  const ids = [...new Set(menuIds.filter(Boolean))]
  for (const menuId of ids) {
    const response = await fetchGestorApi(`/api/menus/${menuId}/produtos/${produtoId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(menuPatch),
    })
    if (!response.ok) {
      await parseError(response, 'Erro ao atualizar o produto em um dos cardápios')
    }
  }
}
