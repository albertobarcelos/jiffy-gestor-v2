'use client'

import { useCallback, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  replicarStatusCategoriaBaseNosMenusUseCase,
  statusCategoriaNoMenuUseCase,
} from '@/src/infrastructure/composition/categoriaStatusUseCases'
import { invalidarCatalogoVendaQueries } from '@/src/presentation/cache/catalogoVendaQueryCache'
import { ReplicarCategoriaMenuDialog } from '@/src/presentation/components/features/menus/ReplicarCategoriaMenuDialog'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { buscarMenusDaEmpresa } from '@/src/presentation/utils/uploadImagemProdutoMenus'
import { showToast } from '@/src/shared/utils/toast'

type ReplicacaoPendente = {
  grupoId: string
  nome: string
  ativo: boolean
}

/**
 * Ativa/desativa a categoria só neste cardápio (snapshot `MenuGrupoProduto.ativo`).
 * O cadastro base não é alterado. Depois pergunta se replica aos outros menus.
 */
export function useStatusCategoriaNesteCardapio(params: { menuId: string }): {
  toggleStatus: (input: { grupoId: string; nome: string; ativoAtual: boolean }) => Promise<void>
  dialogReplicacao: ReactNode
} {
  const { menuId } = params
  const invalidate = useInvalidateTenantQueries()
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()
  const [replicacao, setReplicacao] = useState<ReplicacaoPendente | null>(null)
  const [busy, setBusy] = useState(false)

  const invalidarDepoisDaAlteracao = useCallback(
    async (alvoMenuId: string, grupoProdutoId: string) => {
      await invalidate(['menu-grupos', alvoMenuId])
      invalidarCatalogoVendaQueries(queryClient, empresaId, {
        tipo: 'categoria',
        menuId: alvoMenuId,
        grupoProdutoId,
      })
    },
    [empresaId, invalidate, queryClient]
  )

  const toggleStatus = useCallback(
    async (input: { grupoId: string; nome: string; ativoAtual: boolean }) => {
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) return

      const ativo = !input.ativoAtual
      try {
        await statusCategoriaNoMenuUseCase.execute({
          token,
          menuId,
          grupoProdutoId: input.grupoId,
          ativo,
        })
        await invalidarDepoisDaAlteracao(menuId, input.grupoId)
        showToast.success(
          ativo ? 'Categoria ativada neste cardápio' : 'Categoria desativada neste cardápio'
        )

        const outros = (await buscarMenusDaEmpresa({ token })).filter(menu => menu.id !== menuId)
        if (outros.length === 0) return
        setReplicacao({ grupoId: input.grupoId, nome: input.nome, ativo })
      } catch (err) {
        showToast.error(
          err instanceof Error ? err.message : 'Não foi possível atualizar o status da categoria.'
        )
      }
    },
    [invalidarDepoisDaAlteracao, menuId]
  )

  const fecharReplicacao = useCallback(() => {
    if (!busy) setReplicacao(null)
  }, [busy])

  const replicarNosOutrosMenus = useCallback(async () => {
    if (!replicacao) return
    const token = useAuthStore.getState().tenantAuth?.getAccessToken()
    if (!token) return

    setBusy(true)
    try {
      const { menuIdsAlterados } = await replicarStatusCategoriaBaseNosMenusUseCase.execute({
        token,
        grupoProdutoId: replicacao.grupoId,
        ativo: replicacao.ativo,
        excetoMenuId: menuId,
      })
      for (const outroMenuId of menuIdsAlterados) {
        await invalidarDepoisDaAlteracao(outroMenuId, replicacao.grupoId)
      }
      setReplicacao(null)
      showToast.success(
        menuIdsAlterados.length > 0
          ? 'Categoria atualizada nos outros cardápios'
          : 'Nenhum outro cardápio tem esta categoria'
      )
    } catch (err) {
      showToast.error(
        err instanceof Error ? err.message : 'Não foi possível replicar a categoria.'
      )
    } finally {
      setBusy(false)
    }
  }, [invalidarDepoisDaAlteracao, menuId, replicacao])

  const dialogReplicacao = (
    <ReplicarCategoriaMenuDialog
      open={Boolean(replicacao)}
      ativo={replicacao?.ativo ?? false}
      nomeCategoria={replicacao?.nome ?? 'A categoria'}
      busy={busy}
      onSomenteAqui={fecharReplicacao}
      onReplicar={() => void replicarNosOutrosMenus()}
    />
  )

  return { toggleStatus, dialogReplicacao }
}
