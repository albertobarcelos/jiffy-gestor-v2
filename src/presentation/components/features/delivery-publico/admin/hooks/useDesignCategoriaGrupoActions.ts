'use client'

import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import {
  fetchGrupoProdutoImagemUrl,
  mensagemLegivelDeliveryMediaError,
  uploadGrupoProdutoImagem,
} from '@/src/infrastructure/api/deliveryMediaApi'
import { validateDeliveryImageFile } from '@/src/shared/constants/deliveryImageUpload'
import { showToast } from '@/src/shared/utils/toast'
import type { DesignCategoriaGrupo } from '../../shared/types/designCategoriaGrupo'

export function useDesignCategoriaGrupoActions() {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  const [uploadingGrupoId, setUploadingGrupoId] = useState<string | null>(null)
  const [reorderingGrupoId, setReorderingGrupoId] = useState<string | null>(null)
  const [updatingIconGrupoId, setUpdatingIconGrupoId] = useState<string | null>(null)

  const invalidateGrupos = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['grupos-produtos'], exact: false })
  }, [queryClient])

  const reordenarGrupo = useCallback(
    async (grupoId: string, novaPosicao: number) => {
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado')
        throw new Error('Token não encontrado')
      }

      setReorderingGrupoId(grupoId)
      try {
        const response = await fetch(`/api/grupos-produtos/${grupoId}/reordena-grupo`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ novaPosicao }),
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          throw new Error(error.message || 'Erro ao reordenar grupo')
        }

        await invalidateGrupos()
      } finally {
        setReorderingGrupoId(null)
      }
    },
    [auth, invalidateGrupos]
  )

  const uploadImagemGrupo = useCallback(
    async (grupoId: string, file: File): Promise<string | null> => {
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado')
        throw new Error('Token não encontrado')
      }

      const validationError = await validateDeliveryImageFile(file)
      if (validationError) {
        showToast.error(validationError)
        throw new Error(validationError)
      }

      setUploadingGrupoId(grupoId)
      const toastId = showToast.loading('Enviando imagem...')

      try {
        await uploadGrupoProdutoImagem(grupoId, file, token)
        const imagemUrl = await fetchGrupoProdutoImagemUrl(grupoId, token)
        showToast.successLoading(toastId, 'Imagem salva no grupo!')
        await invalidateGrupos()
        return imagemUrl
      } catch (error) {
        showToast.errorLoading(toastId, mensagemLegivelDeliveryMediaError(error))
        throw error
      } finally {
        setUploadingGrupoId(null)
      }
    },
    [auth, invalidateGrupos]
  )

  const patchGrupoImagemUrl = useCallback(
    (grupos: DesignCategoriaGrupo[], grupoId: string, imagemUrl: string | null) =>
      grupos.map(grupo =>
        grupo.id === grupoId ? { ...grupo, imagemUrl: imagemUrl?.trim() || null } : grupo
      ),
    []
  )

  const patchGrupoIconName = useCallback(
    (grupos: DesignCategoriaGrupo[], grupoId: string, iconName: string) =>
      grupos.map(grupo => (grupo.id === grupoId ? { ...grupo, iconName } : grupo)),
    []
  )

  const atualizarIconeGrupo = useCallback(
    async (grupoId: string, iconName: string) => {
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado')
        throw new Error('Token não encontrado')
      }

      setUpdatingIconGrupoId(grupoId)
      try {
        const response = await fetch(`/api/grupos-produtos/${grupoId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ iconName }),
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          throw new Error(error.message || 'Erro ao salvar ícone do grupo')
        }

        await invalidateGrupos()
      } finally {
        setUpdatingIconGrupoId(null)
      }
    },
    [auth, invalidateGrupos]
  )

  return {
    reordenarGrupo,
    uploadImagemGrupo,
    atualizarIconeGrupo,
    patchGrupoImagemUrl,
    patchGrupoIconName,
    uploadingGrupoId,
    reorderingGrupoId,
    updatingIconGrupoId,
    invalidateGrupos,
  }
}
