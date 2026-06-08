'use client'

import { useCallback, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { fetchAccessTokenEscolherEmpresa } from '@/src/presentation/utils/escolherEmpresaApi'
import {
  buildEmpresaUrlParam,
  bootstrapTabSessionManually,
  syncEmpresaUrlPathFromSession,
} from '@/src/shared/utils/tabSession'
import { buildGestaoPath, stripGestaoEmpresaSlugFromPath } from '@/src/shared/utils/gestaoRoutes'
import { buildAuthFromAccessToken } from '@/src/shared/utils/buildAuthFromAccessToken'
import type { LoginEmpresaSnapshot } from '@/src/domain/types/LoginEmpresaSnapshot'

export function useTrocarEmpresaGestor() {
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const setTenantAuth = useAuthStore(s => s.setTenantAuth)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const { empresa: empresaLogada } = useEmpresaMe()
  const [busyEmpresaId, setBusyEmpresaId] = useState<string | null>(null)

  const trocarEmpresa = useCallback(
    async (empresa: LoginEmpresaSnapshot) => {
      if (empresa.bloqueado) {
        return
      }
      if (empresaLogada?.id === empresa.id) {
        return
      }

      if (!isAuthenticated) {
        toast.error('Sessão indisponível para trocar de empresa. Faça login novamente.')
        return
      }

      setBusyEmpresaId(empresa.id)
      try {
        const token = await fetchAccessTokenEscolherEmpresa(empresa.id)
        const nomeSlug = empresa.nomeFantasia?.trim() || 'empresa'
        const empParam = buildEmpresaUrlParam(nomeSlug, empresa.id)
        bootstrapTabSessionManually(token, empParam)

        const prev = useAuthStore.getState().getUser()
        const auth = buildAuthFromAccessToken(
          token,
          prev ? { id: prev.getId(), email: prev.getEmail(), name: prev.getName() } : undefined
        )
        setTenantAuth(auth)

        await queryClient.invalidateQueries()
        const modulePath = stripGestaoEmpresaSlugFromPath(pathname) || '/dashboard'
        router.replace(buildGestaoPath(empParam, modulePath))
        syncEmpresaUrlPathFromSession()
        router.refresh()
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Não foi possível abrir esta empresa'
        toast.error(msg)
      } finally {
        setBusyEmpresaId(null)
      }
    },
    [empresaLogada?.id, isAuthenticated, pathname, queryClient, router, setTenantAuth]
  )

  /** Troca de empresa usa cookie de identidade no BFF; basta sessão ativa + lista do hub. */
  const podeTrocar = isAuthenticated

  return { trocarEmpresa, busyEmpresaId, podeTrocar }
}
