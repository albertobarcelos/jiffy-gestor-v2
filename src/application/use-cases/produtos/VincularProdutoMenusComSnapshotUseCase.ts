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
  const imageId = produto.image?.imageId
  if (imageId) {
    out.imageId = imageId
  }
  return out
}

/**
 * Escolhe um cardápio já vinculado que tenha imagem no snapshot.
 * Retorna undefined se nenhum candidato tiver imagem — nesse caso o vínculo simples
 * (add/remove) restaura o soft-delete preservando a imagem anterior do próprio menu.
 */
export async function resolverMenuOrigemComSnapshotImagem(params: {
  token: string
  produtoId: string
  candidatos: string[]
}): Promise<string | undefined> {
  const ids = [...new Set(params.candidatos.filter(Boolean))]
  if (ids.length === 0) return undefined

  for (const menuId of ids) {
    try {
      const snap = await buscarMenuProdutoNoCardapio({
        token: params.token,
        menuId,
        produtoId: params.produtoId,
      })
      if (snap.image?.imageId) return menuId
    } catch {
      // tenta o próximo candidato
    }
  }

  return undefined
}

/**
 * Vincula/desvincula menus copiando snapshot (incl. imagem) de um cardápio de origem quando possível.
 */
export async function persistirVinculosProdutoComSnapshotOpcional(params: {
  token: string
  produtoId: string
  add: string[]
  remove: string[]
  /** Menus já vinculados antes desta operação — candidatos à origem do snapshot. */
  menusOrigemCandidatos: string[]
  vincularSimples: (input: { add: string[]; remove: string[] }) => Promise<void>
}): Promise<void> {
  const add = [...new Set(params.add.filter(Boolean))]
  const remove = [...new Set(params.remove.filter(Boolean))]

  if (add.length === 0) {
    if (remove.length === 0) return
    await vincularProdutoMenusComSnapshot({
      token: params.token,
      produtoId: params.produtoId,
      add: [],
      remove,
    })
    return
  }

  const candidatos = params.menusOrigemCandidatos.filter(id => !add.includes(id))
  const menuOrigemId = await resolverMenuOrigemComSnapshotImagem({
    token: params.token,
    produtoId: params.produtoId,
    candidatos,
  })

  if (menuOrigemId) {
    await vincularProdutoMenusComSnapshot({
      token: params.token,
      produtoId: params.produtoId,
      add,
      remove,
      menuOrigemId,
    })
    return
  }

  await params.vincularSimples({ add, remove })
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
