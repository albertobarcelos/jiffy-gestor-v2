'use client'

import {
  aplicarReordenacaoPizzaUseCase,
  atualizarPizzaCategoriaViaBffUseCase,
  atualizarPizzaSaborViaBffUseCase,
  buscarPizzaCategoriaViaBffUseCase,
  buscarPizzaSaborViaBffUseCase,
  criarPizzaCategoriaCompletoViaBffUseCase,
  criarPizzaComplementoViaBffUseCase,
  criarPizzaSaborViaBffUseCase,
  desvincularPizzaComplementoViaBffUseCase,
  listarPizzaCategoriasViaBffUseCase,
  listarPizzaComplementosViaBffUseCase,
  listarPizzaSaboresViaBffUseCase,
  listarPizzaTamanhosViaBffUseCase,
  reordenarPizzaCategoriaViaBffUseCase,
  reordenarPizzaSaborViaBffUseCase,
  substituirPrecosPizzaComplementoViaBffUseCase,
} from '@/src/infrastructure/composition/pizzaUseCases'
import type { AplicarReordenacaoPizzaInput } from '@/src/application/use-cases/pizza/AplicarReordenacaoPizzaUseCase'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import type {
  CategoriaPizza,
  CategoriaPizzaCompletoResponse,
  ComplementoPizza,
  CreateComplementoPizzaInput,
  CreateCategoriaPizzaCompletoInput,
  CreateSaborPizzaInput,
  PizzaTamanho,
  ReplaceComplementoPizzaPrecosInput,
  SaborPizza,
  SaborPizzaSummary,
  UpdateCategoriaPizzaInput,
  UpdateSaborPizzaInput,
} from '@/src/shared/types/pizza'

export function usePizzaCategorias(params: {
  q?: string
  ativo?: boolean | null
  limit?: number
  offset?: number
  enabled?: boolean
} = {}) {
  const { q = '', ativo = null, limit = 50, offset = 0, enabled = true } = params

  return useSecureTenantQuery<{ items: CategoriaPizza[]; count: number }>(
    ['pizza', 'categorias', q, ativo, limit, offset],
    ({ token }) =>
      listarPizzaCategoriasViaBffUseCase.execute({ token, q, ativo, limit, offset }),
    { enabled, staleTime: 1000 * 60 * 2 }
  )
}

export function usePizzaCategoria(categoriaId: string | undefined, enabled = true) {
  return useSecureTenantQuery<CategoriaPizza>(
    ['pizza', 'categoria', categoriaId],
    ({ token }) =>
      buscarPizzaCategoriaViaBffUseCase.execute({ token, categoriaId: categoriaId! }),
    { enabled: Boolean(categoriaId) && enabled }
  )
}

export function usePizzaSabores(
  categoriaPizzaId: string | undefined,
  params: { q?: string; ativo?: boolean | null; limit?: number; enabled?: boolean } = {}
) {
  const { q = '', ativo = null, limit = 100, enabled = true } = params

  return useSecureTenantQuery<{ items: SaborPizzaSummary[]; count: number }>(
    ['pizza', 'sabores', categoriaPizzaId, q, ativo, limit],
    ({ token }) =>
      listarPizzaSaboresViaBffUseCase.execute({
        token,
        categoriaPizzaId: categoriaPizzaId!,
        q,
        ativo,
        limit,
        offset: 0,
      }),
    { enabled: Boolean(categoriaPizzaId) && enabled, staleTime: 1000 * 60 * 2 }
  )
}

export function usePizzaTamanhos(categoriaPizzaId: string | undefined, enabled = true) {
  return useSecureTenantQuery<{ items: PizzaTamanho[]; count: number }>(
    ['pizza', 'tamanhos', categoriaPizzaId],
    ({ token }) =>
      listarPizzaTamanhosViaBffUseCase.execute({
        token,
        categoriaPizzaId: categoriaPizzaId!,
        limit: 50,
        offset: 0,
      }),
    {
      enabled: Boolean(categoriaPizzaId) && enabled,
      staleTime: 1000 * 60 * 2,
      // Mantém lista anterior no refetch (evita flash vazio na aba Preço ao salvar sabor)
      placeholderData: previous => previous,
    }
  )
}

export function usePizzaComplementos(categoriaPizzaId: string | undefined, enabled = true) {
  return useSecureTenantQuery<ComplementoPizza[]>(
    ['pizza', 'complementos', categoriaPizzaId],
    ({ token }) =>
      listarPizzaComplementosViaBffUseCase.execute({ token, categoriaPizzaId: categoriaPizzaId! }),
    { enabled: Boolean(categoriaPizzaId) && enabled, staleTime: 1000 * 60 * 2 }
  )
}

export function useVincularPizzaComplementoMutation() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation<ComplementoPizza, CreateComplementoPizzaInput>(
    ({ token }, input) => criarPizzaComplementoViaBffUseCase.execute({ token, data: input }),
    {
      onSuccess: async (_data, variables) => {
        await invalidate(['pizza', 'complementos', variables.categoriaPizzaId])
      },
    }
  )
}

export function useAtualizarPrecosPizzaComplementoMutation() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation<
    ComplementoPizza,
    { id: string; categoriaPizzaId: string; input: ReplaceComplementoPizzaPrecosInput }
  >(
    ({ token }, { id, input }) =>
      substituirPrecosPizzaComplementoViaBffUseCase.execute({
        token,
        complementoId: id,
        data: input,
      }),
    {
      onSuccess: async (_data, variables) => {
        await invalidate(['pizza', 'complementos', variables.categoriaPizzaId])
      },
    }
  )
}

export function useDesvincularPizzaComplementoMutation() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation<void, { id: string; categoriaPizzaId: string }>(
    ({ token }, { id }) =>
      desvincularPizzaComplementoViaBffUseCase.execute({ token, complementoId: id }),
    {
      onSuccess: async (_data, variables) => {
        await invalidate(['pizza', 'complementos', variables.categoriaPizzaId])
      },
    }
  )
}

export function useCriarPizzaCategoriaCompletoMutation() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation<CategoriaPizzaCompletoResponse, CreateCategoriaPizzaCompletoInput>(
    ({ token }, input) =>
      criarPizzaCategoriaCompletoViaBffUseCase.execute({ token, data: input }),
    {
      onSuccess: async () => {
        await invalidate(['pizza'])
      },
    }
  )
}

export function useCriarPizzaSaborMutation() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation<SaborPizza, CreateSaborPizzaInput>(
    ({ token }, input) => criarPizzaSaborViaBffUseCase.execute({ token, data: input }),
    {
      onSuccess: (_data, variables) => {
        // Invalidação estreita e em background: evita refetch de tamanhos/categorias
        // no meio do modal e não bloqueia o mutateAsync.
        // Hub catalog precisa invalidar para a lista da página Pizzas atualizar.
        void invalidate(['pizza', 'hub'])
        if (variables.categoriaPizzaId) {
          void invalidate(['pizza', 'sabores', variables.categoriaPizzaId])
        }
      },
    }
  )
}

export function useAtualizarPizzaCategoriaMutation() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation<
    CategoriaPizza,
    { id: string; patch: UpdateCategoriaPizzaInput }
  >(
    ({ token }, { id, patch }) =>
      atualizarPizzaCategoriaViaBffUseCase.execute({
        token,
        categoriaId: id,
        data: patch,
      }),
    {
      onSuccess: (_data, variables) => {
        void invalidate(['pizza', 'categorias'])
        void invalidate(['pizza', 'categoria', variables.id])
        void invalidate(['pizza', 'hub'])
      },
    }
  )
}

export function usePizzaSabor(saborId: string | undefined, enabled = true) {
  return useSecureTenantQuery<SaborPizza>(
    ['pizza', 'sabor', saborId],
    ({ token }) => buscarPizzaSaborViaBffUseCase.execute({ token, saborId: saborId! }),
    { enabled: Boolean(saborId) && enabled }
  )
}

export function useAtualizarPizzaSaborMutation() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation<
    SaborPizza,
    { id: string; patch: UpdateSaborPizzaInput; categoriaPizzaId?: string }
  >(
    ({ token }, { id, patch }) =>
      atualizarPizzaSaborViaBffUseCase.execute({ token, saborId: id, data: patch }),
    {
      onSuccess: (_data, variables) => {
        // Sem invalidate(['pizza']): isso refetchava tamanhos e sumia a aba Preço
        // com o erro "Configure os tamanhos..." antes do modal fechar.
        // Invalida só o hub + detalhe/lista do sabor (refresh sob alteração).
        void invalidate(['pizza', 'hub'])
        void invalidate(['pizza', 'sabor', variables.id])
        if (variables.categoriaPizzaId) {
          void invalidate(['pizza', 'sabores', variables.categoriaPizzaId])
        }
      },
    }
  )
}

export function useReordenarPizzaCategoriaMutation() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation<CategoriaPizza, { id: string; novaPosicao: number }>(
    ({ token }, { id, novaPosicao }) =>
      reordenarPizzaCategoriaViaBffUseCase.execute({ token, categoriaId: id, novaPosicao }),
    {
      onSuccess: async () => {
        await invalidate(['pizza'])
      },
    }
  )
}

export function useReordenarPizzaSaborMutation() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation<
    SaborPizzaSummary,
    { id: string; novaPosicao: number; categoriaPizzaId: string }
  >(
    ({ token }, { id, novaPosicao }) =>
      reordenarPizzaSaborViaBffUseCase.execute({ token, saborId: id, novaPosicao }),
    {
      onSuccess: async (_data, variables) => {
        await invalidate(['pizza'])
        await invalidate(['pizza', 'sabores', variables.categoriaPizzaId])
      },
    }
  )
}

export function useAplicarReordenacaoPizzaMutation() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation<void, Omit<AplicarReordenacaoPizzaInput, 'token'>>(
    ({ token }, input) => aplicarReordenacaoPizzaUseCase.execute({ token, ...input }),
    {
      onSuccess: async () => {
        await invalidate(['pizza'])
      },
    }
  )
}
