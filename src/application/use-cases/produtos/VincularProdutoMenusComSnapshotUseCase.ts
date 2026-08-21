import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import type { MenuProduto, UpdateMenuProdutoInput } from '@/src/shared/types/menus'

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

function unwrapMenuProdutoPayload(payload: unknown): MenuProduto {
  if (payload && typeof payload === 'object') {
    const rec = payload as Record<string, unknown>
    if (rec.data && typeof rec.data === 'object' && !Array.isArray(rec.data)) {
      return rec.data as MenuProduto
    }
  }
  return payload as MenuProduto
}

/** Lê o snapshot atual do produto neste cardápio (inclui imageId atualizado). */
export async function buscarMenuProdutoNoCardapio(params: {
  token: string
  menuId: string
  produtoId: string
}): Promise<MenuProduto> {
  const response = await fetchGestorApi(
    `/api/menus/${params.menuId}/produtos/${params.produtoId}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${params.token}`,
      },
      cache: 'no-store',
    }
  )
  if (!response.ok) {
    await parseError(response, 'Erro ao carregar produto deste cardápio')
  }
  return unwrapMenuProdutoPayload(await response.json())
}

/** Campos do snapshot deste cardápio para gravar em outros menus. */
export function snapshotMenuProdutoParaOutrosMenus(
  produto: MenuProduto
): UpdateMenuProdutoInput {
  const out: UpdateMenuProdutoInput = {
    nome: produto.nome,
    descricao: produto.descricao ?? null,
    valor: Number(produto.valor),
    favorito: produto.favorito,
    ativo: produto.ativo,
  }
  if (produto.grupoProduto?.id) {
    out.grupoProdutoId = produto.grupoProduto.id
  }
  out.gruposComplementosIds = (produto.gruposComplementos ?? [])
    .map(g => g.id)
    .filter(Boolean)
  out.imageId = produto.image?.imageId ?? null
  return out
}

/**
 * Vincula/desvincula o produto em outros menus.
 * No add, busca o snapshot fresco do cardápio de origem (quando `menuOrigemId`
 * é informado) para não perder imagem/dados desatualizados no modal.
 */
export async function vincularProdutoMenusComSnapshot(params: {
  token: string
  produtoId: string
  add: string[]
  remove: string[]
  /** Cardápio de origem — usado para recarregar o snapshot antes do vínculo. */
  menuOrigemId?: string
  /** Fallback se não houver `menuOrigemId` ou a busca falhar antes do add. */
  snapshot?: UpdateMenuProdutoInput
}): Promise<void> {
  const { token, produtoId } = params
  const headers = authHeaders(token)
  const add = [...new Set(params.add.filter(Boolean))]
  const remove = [...new Set(params.remove.filter(Boolean))]

  let snapshot = params.snapshot
  if (add.length > 0) {
    if (params.menuOrigemId) {
      const fresco = await buscarMenuProdutoNoCardapio({
        token,
        menuId: params.menuOrigemId,
        produtoId,
      })
      snapshot = snapshotMenuProdutoParaOutrosMenus(fresco)
    }
    if (!snapshot) {
      throw new Error('Snapshot do cardápio de origem é obrigatório ao vincular')
    }
  }

  for (const menuId of add) {
    const response = await fetchGestorApi(`/api/menus/${menuId}/produtos`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        add: [produtoId],
        update: [{ produtoId, ...snapshot }],
      }),
    })
    if (!response.ok) {
      await parseError(response, 'Erro ao vincular o produto a um dos cardápios')
    }
  }

  for (const menuId of remove) {
    const response = await fetchGestorApi(`/api/menus/${menuId}/produtos`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ remove: [produtoId] }),
    })
    if (!response.ok) {
      await parseError(response, 'Erro ao desvincular o produto de um dos cardápios')
    }
  }
}
