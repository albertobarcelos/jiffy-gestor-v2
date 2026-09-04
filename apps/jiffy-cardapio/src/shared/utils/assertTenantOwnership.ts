/**
 * Validação pós-fetch de ownership multi-tenant.
 *
 * Quando a resposta da API inclui `empresaId`, esta função compara com o
 * tenant ativo para detectar possíveis bugs de isolamento no backend.
 *
 * Em desenvolvimento, loga um warning no console.
 * Em produção, descarta silenciosamente o registro suspeito (retorna false).
 *
 * Uso típico: dentro de um `queryFn`, após mapear os itens da API.
 */

type MaybeTenantOwned = {
  empresaId?: string | null | undefined
  [key: string]: unknown
}

export function assertTenantOwnership<T extends MaybeTenantOwned>(
  item: T,
  expectedEmpresaId: string | null
): boolean {
  if (!expectedEmpresaId) return true
  if (!item.empresaId) return true

  if (item.empresaId !== expectedEmpresaId) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[assertTenantOwnership] Item pertence a outra empresa!',
        { esperado: expectedEmpresaId, recebido: item.empresaId, item }
      )
    }
    return false
  }

  return true
}

/**
 * Filtra uma lista, removendo itens que não pertencem ao tenant ativo.
 * Itens sem `empresaId` são mantidos (assumidos como corretos).
 */
export function filterByTenant<T extends MaybeTenantOwned>(
  items: T[],
  expectedEmpresaId: string | null
): T[] {
  if (!expectedEmpresaId) return items
  return items.filter(item => assertTenantOwnership(item, expectedEmpresaId))
}
