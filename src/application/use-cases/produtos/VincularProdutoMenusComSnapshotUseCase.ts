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
 * No add, cria o snapshot e em seguida aplica os dados do cardápio de origem
 * (não o cadastro base).
 */
export async function vincularProdutoMenusComSnapshot(params: {
  token: string
  produtoId: string
  add: string[]
  remove: string[]
  snapshot: UpdateMenuProdutoInput
}): Promise<void> {
  const { token, produtoId, snapshot } = params
  const headers = authHeaders(token)
  const add = [...new Set(params.add.filter(Boolean))]
  const remove = [...new Set(params.remove.filter(Boolean))]

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
