'use client'

import { useCallback, useState } from 'react'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { showToast } from '@/src/shared/utils/toast'
import type { DesignCategoriaGrupo } from '../../shared/types/designCategoriaGrupo'

export function useDesignCategoriaGrupoActions(menuId: string | null) {
  const invalidate = useInvalidateTenantQueries()
  const [uploadingGrupoId, setUploadingGrupoId] = useState<string | null>(null)
  const [reorderingGrupoId, setReorderingGrupoId] = useState<string | null>(null)

  const invalidateGrupos = useCallback(async () => {
    if (!menuId) return
    await invalidate(['menu-grupos', menuId])
  }, [invalidate, menuId])

  const exigirMenu = useCallback(() => {
    if (!menuId) {
      const message = 'Configure o cardápio publicado no delivery antes de editar as categorias.'
      showToast.error(message)
      throw new Error(message)
    }
    return menuId
  }, [menuId])

  const reordenarGrupo = useCallback(
    async (grupoId: string, novaPosicao: number) => {
      const idMenu = exigirMenu()
      setReorderingGrupoId(grupoId)
      try {
        const response = await fetchGestorApi(
          `/api/menus/${idMenu}/grupos-produtos/${encodeURIComponent(grupoId)}/reordena-grupo`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ novaPosicao }),
          }
        )

        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          throw new Error(
            (error as { message?: string }).message || 'Erro ao reordenar grupo'
          )
        }

        await invalidateGrupos()
      } finally {
        setReorderingGrupoId(null)
      }
    },
    [exigirMenu, invalidateGrupos]
  )

  const uploadImagemGrupo = useCallback(
    async (grupoId: string, file: File): Promise<string | null> => {
      const idMenu = exigirMenu()
      setUploadingGrupoId(grupoId)
      const toastId = showToast.loading('Enviando imagem...')

      try {
        const form = new FormData()
        form.append('file', file)
        const response = await fetchGestorApi(
          `/api/menus/${idMenu}/grupos-produtos/${encodeURIComponent(grupoId)}/imagem`,
          {
            method: 'POST',
            body: form,
          }
        )

        const payload = (await response.json().catch(() => ({}))) as {
          message?: string
          imagemUrl?: string | null
        }

        if (!response.ok) {
          throw new Error(payload.message || 'Erro ao enviar imagem do grupo')
        }

        const imagemUrl = payload.imagemUrl?.trim() || null
        showToast.successLoading(toastId, 'Imagem salva no grupo!')
        await invalidateGrupos()
        return imagemUrl
      } catch (error) {
        showToast.errorLoading(
          toastId,
          error instanceof Error ? error.message : 'Erro ao enviar imagem do grupo'
        )
        throw error
      } finally {
        setUploadingGrupoId(null)
      }
    },
    [exigirMenu, invalidateGrupos]
  )

  const patchGrupoImagemUrl = useCallback(
    (grupos: DesignCategoriaGrupo[], grupoId: string, imagemUrl: string | null) =>
      grupos.map(grupo =>
        grupo.id === grupoId ? { ...grupo, imagemUrl: imagemUrl?.trim() || null } : grupo
      ),
    []
  )

  return {
    reordenarGrupo,
    uploadImagemGrupo,
    patchGrupoImagemUrl,
    uploadingGrupoId,
    reorderingGrupoId,
    invalidateGrupos,
  }
}
