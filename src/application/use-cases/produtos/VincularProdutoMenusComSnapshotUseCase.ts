import { fetchBffVoid } from '@/src/infrastructure/api/bffClient'
import {
  fetchMenuProdutoOrThrow,
  fetchMenuProdutoSnapshot,
} from '@/src/infrastructure/api/repositories/menuCatalogFetch'
import type { MenuProduto, UpdateMenuProdutoInput } from '@/src/shared/types/menus'

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

export class VincularProdutoMenusComSnapshotUseCase {
  async buscarMenuProdutoNoCardapio(params: {
    token: string
    menuId: string
    produtoId: string
  }): Promise<MenuProduto> {
    return fetchMenuProdutoOrThrow(params.menuId, params.produtoId, params.token)
  }

  async resolverMenuOrigemComSnapshotImagem(params: {
    token: string
    produtoId: string
    candidatos: string[]
  }): Promise<string | undefined> {
    const ids = [...new Set(params.candidatos.filter(Boolean))]
    if (ids.length === 0) return undefined

    for (const menuId of ids) {
      try {
        const snap = await fetchMenuProdutoSnapshot(menuId, params.produtoId, params.token)
        if (snap?.image?.imageId) return menuId
      } catch {
        // tenta o próximo candidato
      }
    }

    return undefined
  }

  async vincularProdutoMenusComSnapshot(params: {
    token: string
    produtoId: string
    add: string[]
    remove: string[]
    menuOrigemId?: string
    snapshot?: UpdateMenuProdutoInput
  }): Promise<void> {
    const { token, produtoId } = params
    const add = [...new Set(params.add.filter(Boolean))]
    const remove = [...new Set(params.remove.filter(Boolean))]

    let snapshot = params.snapshot
    if (add.length > 0) {
      if (params.menuOrigemId) {
        const fresco = await fetchMenuProdutoOrThrow(
          params.menuOrigemId,
          produtoId,
          token
        )
        snapshot = snapshotMenuProdutoParaOutrosMenus(fresco)
      }
      if (!snapshot) {
        throw new Error('Snapshot do cardápio de origem é obrigatório ao vincular')
      }
    }

    for (const menuId of add) {
      await fetchBffVoid(`/api/menus/${encodeURIComponent(menuId)}/produtos`, token, {
        method: 'PATCH',
        body: JSON.stringify({
          add: [produtoId],
          update: [{ produtoId, ...snapshot }],
        }),
      })
    }

    for (const menuId of remove) {
      await fetchBffVoid(`/api/menus/${encodeURIComponent(menuId)}/produtos`, token, {
        method: 'PATCH',
        body: JSON.stringify({ remove: [produtoId] }),
      })
    }
  }

  async persistirVinculosProdutoComSnapshotOpcional(params: {
    token: string
    produtoId: string
    add: string[]
    remove: string[]
    menusOrigemCandidatos: string[]
    vincularSimples: (input: { add: string[]; remove: string[] }) => Promise<void>
  }): Promise<void> {
    const add = [...new Set(params.add.filter(Boolean))]
    const remove = [...new Set(params.remove.filter(Boolean))]

    if (add.length === 0) {
      if (remove.length === 0) return
      await this.vincularProdutoMenusComSnapshot({
        token: params.token,
        produtoId: params.produtoId,
        add: [],
        remove,
      })
      return
    }

    const candidatos = params.menusOrigemCandidatos.filter(id => !add.includes(id))
    const menuOrigemId = await this.resolverMenuOrigemComSnapshotImagem({
      token: params.token,
      produtoId: params.produtoId,
      candidatos,
    })

    if (menuOrigemId) {
      await this.vincularProdutoMenusComSnapshot({
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
}

export const vincularProdutoMenusComSnapshotUseCase =
  new VincularProdutoMenusComSnapshotUseCase()

export async function buscarMenuProdutoNoCardapio(params: {
  token: string
  menuId: string
  produtoId: string
}): Promise<MenuProduto> {
  return vincularProdutoMenusComSnapshotUseCase.buscarMenuProdutoNoCardapio(params)
}

export async function resolverMenuOrigemComSnapshotImagem(params: {
  token: string
  produtoId: string
  candidatos: string[]
}): Promise<string | undefined> {
  return vincularProdutoMenusComSnapshotUseCase.resolverMenuOrigemComSnapshotImagem(params)
}

export async function persistirVinculosProdutoComSnapshotOpcional(params: {
  token: string
  produtoId: string
  add: string[]
  remove: string[]
  menusOrigemCandidatos: string[]
  vincularSimples: (input: { add: string[]; remove: string[] }) => Promise<void>
}): Promise<void> {
  return vincularProdutoMenusComSnapshotUseCase.persistirVinculosProdutoComSnapshotOpcional(
    params
  )
}

export async function vincularProdutoMenusComSnapshot(params: {
  token: string
  produtoId: string
  add: string[]
  remove: string[]
  menuOrigemId?: string
  snapshot?: UpdateMenuProdutoInput
}): Promise<void> {
  return vincularProdutoMenusComSnapshotUseCase.vincularProdutoMenusComSnapshot(params)
}
