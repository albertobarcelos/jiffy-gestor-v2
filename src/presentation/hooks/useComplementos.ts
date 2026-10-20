import { useQueryClient } from '@tanstack/react-query'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantInfiniteQuery } from '@/src/presentation/hooks/useSecureTenantInfiniteQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { Complemento } from '@/src/domain/entities/Complemento'
import { hidratarComplemento } from '@/src/application/services/cadastroImagem'
import { complementoImagemMedia } from '@/src/infrastructure/api/deliveryMediaApi'
import { showToast } from '@/src/shared/utils/toast'
import { criarPersistirCadastroComplementoUseCase } from '@/src/presentation/hooks/complementos/criarPersistirCadastroComplementoUseCase'
import { invalidarCatalogoVendaQueries } from '@/src/presentation/cache/catalogoVendaQueryCache'
import type { DadosCadastroComplemento } from '@/src/application/ports/ICadastroComplemento'

interface ComplementosQueryParams {
  q?: string
  ativo?: boolean | null
  limit?: number
  offset?: number
}

function hidratarLista(complementos: Complemento[]): Complemento[] {
  return complementos.map(item => hidratarComplemento(complementoImagemMedia, item))
}

/**
 * Hook para buscar complementos com paginação infinita
 */
export function useComplementosInfinite(params: Omit<ComplementosQueryParams, 'offset'> = {}) {
  return useSecureTenantInfiniteQuery(
    ['complementos', 'infinite', params],
    async ({ token }, pageParam) => {
      const limit = params.limit || 10
      const { complementos: brutos, total } = await criarPersistirCadastroComplementoUseCase().listar({
        token,
        q: params.q,
        ativo: params.ativo,
        limit,
        offset: Number(pageParam) || 0,
      })
      const complementos = hidratarLista(brutos)
      const hasMore = complementos.length === limit
      const nextOffset = hasMore ? Number(pageParam) + complementos.length : null

      return {
        complementos,
        count: total,
        nextOffset,
      }
    },
    {
      initialPageParam: 0,
      getNextPageParam: lastPage => lastPage.nextOffset,
      staleTime: 1000 * 60 * 5,
    }
  )
}

/**
 * Hook para buscar complementos simples (sem paginação infinita).
 * Ideal para uso em formulários e dropdowns.
 */
export function useComplementos(params: { ativo?: boolean; limit?: number } = {}) {
  const normalizedLimit = Math.min(params.limit ?? 100, 2000)

  return useSecureTenantQuery<Complemento[]>(
    ['complementos', 'simple', params.ativo, normalizedLimit],
    async ({ token }) => {
      const { complementos } = await criarPersistirCadastroComplementoUseCase().listar({
        token,
        ativo: params.ativo,
        limit: normalizedLimit,
        offset: 0,
      })
      return hidratarLista(complementos)
    },
    { staleTime: 1000 * 60 * 10 }
  )
}

/**
 * Hook para buscar um único complemento por ID usando React Query.
 * Ideal para componentes de visualização e edição.
 */
export function useComplemento(id: string) {
  return useSecureTenantQuery<Complemento>(
    ['complemento', id],
    async ({ token }) => {
      const complemento = await criarPersistirCadastroComplementoUseCase().buscar({
        id,
        token,
      })
      return hidratarComplemento(complementoImagemMedia, complemento)
    },
    { staleTime: 1000 * 60 * 5, enabled: !!id }
  )
}

/**
 * Hook para criar/atualizar complemento
 */
export function useComplementoMutation() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation(
    async (
      { token },
      {
        complementoId,
        data,
        isUpdate,
      }: { complementoId?: string; data: DadosCadastroComplemento; isUpdate: boolean }
    ) => {
      const cadastro = criarPersistirCadastroComplementoUseCase()
      const salvo =
        isUpdate && complementoId
          ? await cadastro.atualizar({ token, id: complementoId, dados: data })
          : await cadastro.criar({ token, dados: data })
      return salvo.toJSON()
    },
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'complementos'] })
        invalidarCatalogoVendaQueries(queryClient, empresaId, {
          tipo: 'complemento',
          complementoId: variables.complementoId,
        })
        showToast.success(
          variables.isUpdate ? 'Complemento atualizado com sucesso!' : 'Complemento criado com sucesso!'
        )
      },
    }
  )
}
