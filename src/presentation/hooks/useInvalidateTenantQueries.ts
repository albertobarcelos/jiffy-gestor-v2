'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'

/**
 * Constrói uma query key com escopo de empresa.
 * Função pura — pode ser usada fora de componentes (ex.: `onMutate`, `setQueriesData`).
 *
 * @example
 * buildTenantQueryKey('abc-123', ['vendas'])
 * // → ['tenant', 'abc-123', 'vendas']
 */
export function buildTenantQueryKey(
  empresaId: string | null,
  baseKey: readonly unknown[]
): readonly unknown[] {
  return ['tenant', empresaId, ...baseKey]
}

/**
 * Retorna uma função `invalidate` com escopo de empresa injetado automaticamente.
 *
 * Substitui chamadas manuais como:
 *   `queryClient.invalidateQueries({ queryKey: ['vendas'] })`
 * por:
 *   `invalidate(['vendas'])` → invalida `['tenant', empresaId, 'vendas']`
 *
 * @example
 * const invalidate = useInvalidateTenantQueries()
 *
 * // Em onSuccess:
 * await invalidate(['vendas'])
 * await invalidate(['venda', id])
 */
export function useInvalidateTenantQueries() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return (
    baseKey: readonly unknown[],
    options?: Parameters<typeof queryClient.invalidateQueries>[1]
  ) => {
    return queryClient.invalidateQueries(
      { queryKey: buildTenantQueryKey(empresaId, baseKey) },
      options
    )
  }
}
