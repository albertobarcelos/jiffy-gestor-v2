import type { GrupoComplementoLote } from '@/src/application/complementos/menuComplementoLote'
import {
  montarGrupoImpactoLoteDeJson,
  type GrupoImpactoLote,
} from '@/src/application/complementos/impactoComplementoLote'
import {
  gestorConfigJson,
  requireGestorConfig,
} from '@/src/infrastructure/api/gestorConfigRequest'

export async function listarGruposComplementoMenuLoteApi(
  menuId: string,
  token: string
): Promise<GrupoComplementoLote[]> {
  const data = requireGestorConfig<{ grupos?: GrupoComplementoLote[] }>(
    await gestorConfigJson(
      `/api/menus/${encodeURIComponent(menuId)}/grupos-complementos-lote`,
      token
    )
  )
  return Array.isArray(data.grupos) ? data.grupos : []
}

export async function buscarGrupoImpactoLoteApi(
  grupoId: string,
  token: string
): Promise<GrupoImpactoLote> {
  const data = requireGestorConfig(
    await gestorConfigJson(`/api/grupos-complementos/${encodeURIComponent(grupoId)}`, token)
  )
  const grupo = montarGrupoImpactoLoteDeJson(data)
  if (!grupo) {
    throw new Error('Grupo de complementos inválido')
  }
  return grupo
}

export async function reordenarGrupoComplementoNoMenuApi(
  input: {
    menuId: string
    produtoId: string
    grupoComplementoId: string
    novaPosicao: number
  },
  token: string
): Promise<void> {
  requireGestorConfig(
    await gestorConfigJson(
      `/api/menus/${encodeURIComponent(input.menuId)}/produtos/${encodeURIComponent(input.produtoId)}/reordena-grupo-complemento`,
      token,
      {
        method: 'PATCH',
        json: {
          novaPosicao: input.novaPosicao,
          grupoComplementoId: input.grupoComplementoId,
        },
      }
    )
  )
}

export async function reordenarComplementoNoMenuApi(
  input: {
    menuId: string
    produtoId: string
    grupoComplementoId: string
    complementoId: string
    novaPosicao: number
  },
  token: string
): Promise<void> {
  requireGestorConfig(
    await gestorConfigJson(
      `/api/menus/${encodeURIComponent(input.menuId)}/produtos/${encodeURIComponent(input.produtoId)}/reordena-complemento`,
      token,
      {
        method: 'PATCH',
        json: {
          novaPosicao: input.novaPosicao,
          grupoComplementoId: input.grupoComplementoId,
          complementoId: input.complementoId,
        },
      }
    )
  )
}
