'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { showToast } from '@/src/shared/utils/toast'
import { updateProdutoPatch } from '@/src/application/use-cases/produtos/UpdateProdutoPatchUseCase'
import { applyPatchToInfinitePages } from '@/src/presentation/components/features/produtos/ProdutosList/utils'
import { toggleFieldConfig } from '@/src/presentation/components/features/produtos/ProdutosList/constants'
import type { ProdutoPatch, ToggleField } from '@/src/shared/types/produto'
import {
  aplicarTogglePermissaoNoIndex,
  MENU_PRODUTO_PERMISSAO_FIELDS,
  type CatalogoProdutoListaIndex,
} from '@/src/shared/utils/menuProdutoPermissoes'
import { CATALOGO_PRODUTOS_INDEX_QUERY_KEY } from '@/src/presentation/hooks/produtos/useProdutosCodigoPorId'

export type ProdutoPatchPayload =
  | { type: 'nome'; produtoId: string; novoNome: string }
  | { type: 'valor'; produtoId: string; novoValor: number }
  | { type: 'grupo'; produtoId: string; novoGrupoId: string; novoGrupoNome: string }
  | { type: 'status'; produtoId: string; novoStatus: boolean; filterStatus?: string }
  | { type: 'toggle'; produtoId: string; field: ToggleField; novoValor: boolean }

/** Verifica se a mutation está pendente para um produto/tipo específico. */
export function isSavingOf(
  mutation: { isPending: boolean; variables?: ProdutoPatchPayload },
  produtoId: string,
  type: ProdutoPatchPayload['type']
): boolean {
  return (
    mutation.isPending &&
    mutation.variables?.produtoId === produtoId &&
    mutation.variables?.type === type
  )
}

function payloadToPatch(payload: ProdutoPatchPayload): ProdutoPatch {
  switch (payload.type) {
    case 'nome':
      return { nome: payload.novoNome }
    case 'valor':
      return { valor: payload.novoValor }
    case 'grupo':
      return { grupoId: payload.novoGrupoId, nomeGrupo: payload.novoGrupoNome }
    case 'status':
      return { ativo: payload.novoStatus }
    case 'toggle':
      return { [payload.field]: payload.novoValor }
  }
}

function successMessage(payload: ProdutoPatchPayload): string {
  switch (payload.type) {
    case 'nome':
      return 'Nome atualizado com sucesso!'
    case 'valor':
      return 'Valor atualizado com sucesso!'
    case 'grupo':
      return 'Categoria atualizada com sucesso!'
    case 'status':
      return payload.novoStatus
        ? 'Produto disponível no cadastro e nos cardápios vinculados!'
        : 'Produto indisponível no cadastro e nos cardápios vinculados!'
    case 'toggle': {
      const cfg = toggleFieldConfig[payload.field]
      return payload.novoValor ? cfg.successTrue : cfg.successFalse
    }
  }
}

type ProdutoPatchMutationContext = {
  snapshot: [unknown, unknown][]
  catalogoIndex: CatalogoProdutoListaIndex | undefined
  catalogoIndexKey: readonly unknown[]
}

/**
 * Mutation com atualização otimista + rollback automático para patches de produto.
 * Usa updateProdutoPatch como único use-case de infra para todos os tipos de patch.
 */
export function useProdutoPatchMutation() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation<void, ProdutoPatchPayload, ProdutoPatchMutationContext>(
    async ({ token }, payload) =>
      updateProdutoPatch({ produtoId: payload.produtoId, patch: payloadToPatch(payload), token }),
    {
    onMutate: async (payload) => {
      const catalogoIndexKey = ['tenant', empresaId, ...CATALOGO_PRODUTOS_INDEX_QUERY_KEY]
      await queryClient.cancelQueries({ queryKey: ['tenant', empresaId, 'produtos', 'infinite'], exact: false })
      await queryClient.cancelQueries({ queryKey: catalogoIndexKey })
      const snapshot = queryClient.getQueriesData<unknown>({ queryKey: ['tenant', empresaId, 'produtos', 'infinite'] })
      const catalogoIndex = queryClient.getQueryData<CatalogoProdutoListaIndex>(catalogoIndexKey)
      const patch = payloadToPatch(payload)

      queryClient.setQueriesData(
        { queryKey: ['tenant', empresaId, 'produtos', 'infinite'], exact: false },
        (old) => applyPatchToInfinitePages(old, payload.produtoId, patch)
      )

      if (
        payload.type === 'toggle' &&
        MENU_PRODUTO_PERMISSAO_FIELDS.includes(
          payload.field as (typeof MENU_PRODUTO_PERMISSAO_FIELDS)[number]
        )
      ) {
        queryClient.setQueryData(
          catalogoIndexKey,
          aplicarTogglePermissaoNoIndex(
            catalogoIndex,
            payload.produtoId,
            payload.field as (typeof MENU_PRODUTO_PERMISSAO_FIELDS)[number],
            payload.novoValor
          )
        )
      }

      return {
        snapshot: snapshot as [unknown, unknown][],
        catalogoIndex,
        catalogoIndexKey,
      }
    },

    onError: (_err, _payload, ctx) => {
      if (ctx?.snapshot) {
        ctx.snapshot.forEach(([key, data]) => {
          queryClient.setQueryData(key as Parameters<typeof queryClient.setQueryData>[0], data)
        })
      }
      if (ctx) {
        queryClient.setQueryData(ctx.catalogoIndexKey, ctx.catalogoIndex)
      }
      showToast.error(_err.message || 'Erro ao atualizar produto')
    },

    onSuccess: (_data, payload) => {
      showToast.success(successMessage(payload))
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['tenant', empresaId, 'produtos', 'infinite'],
        exact: false,
        refetchType: 'none',
      })
    },
    }
  )
}
