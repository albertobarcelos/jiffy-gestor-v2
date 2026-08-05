import { extractEmpresaIdPrefix } from '@/src/shared/utils/tabSession'
import { extractTokenInfo } from '@/src/shared/utils/validateToken'
import { SESSION_STORAGE_EMPRESA_ID } from '@/src/shared/constants/sessionCoordinator'

export type TabBootstrapDecision =
  | { type: 'activate'; token: string }
  | { type: 'rebind'; empresaId: string; empParam: string }
  | { type: 'redirect-hub' }
  | { type: 'wait' }

/** URL slug é canônico — o token da aba deve bater com o prefixo do slug. */
export function tokenMatchesUrlEmpresa(token: string, empParam: string | null): boolean {
  if (!empParam) return true
  const prefix = extractEmpresaIdPrefix(empParam)
  if (!prefix) return true
  const empresaId = extractTokenInfo(token).empresaId
  if (!empresaId) return false
  return empresaId.replace(/-/g, '').startsWith(prefix)
}

export function resolveEmpresaIdFromUrl(
  empParam: string | null,
  hubEmpresas: Array<{ id: string }> | null | undefined,
  storedEmpresaId?: string | null
): string | null {
  const idPrefix = extractEmpresaIdPrefix(empParam)
  if (!idPrefix) return null

  const fromHub = hubEmpresas?.find(e => e.id.replace(/-/g, '').startsWith(idPrefix))
  if (fromHub) return fromHub.id

  const stored =
    storedEmpresaId !== undefined
      ? storedEmpresaId
      : (() => {
          try {
            return sessionStorage.getItem(SESSION_STORAGE_EMPRESA_ID)
          } catch {
            return null
          }
        })()

  if (stored && stored.replace(/-/g, '').startsWith(idPrefix)) return stored
  return null
}

/**
 * Decisão pura do bootstrap (URL canônica ↔ token).
 * Usada por `TabSessionBootstrap` e coberta por testes unitários.
 */
export function decideTabSessionBootstrap(input: {
  empParam: string | null
  /** Token já consumido do pending hub (`jiffy:pending-session:*`). */
  pendingToken: string | null
  existingToken: string | null
  hubEmpresas: Array<{ id: string }> | null | undefined
  storedEmpresaId?: string | null
}): TabBootstrapDecision {
  const { empParam, pendingToken, existingToken, hubEmpresas, storedEmpresaId } = input

  if (pendingToken) {
    return { type: 'activate', token: pendingToken }
  }

  if (existingToken) {
    if (tokenMatchesUrlEmpresa(existingToken, empParam)) {
      return { type: 'activate', token: existingToken }
    }

    const empresaId = resolveEmpresaIdFromUrl(empParam, hubEmpresas, storedEmpresaId)
    if (!empresaId || !empParam) {
      return { type: 'redirect-hub' }
    }
    return { type: 'rebind', empresaId, empParam }
  }

  const empresaId = resolveEmpresaIdFromUrl(empParam, hubEmpresas, storedEmpresaId)
  if (!empresaId || !empParam || !hubEmpresas?.length) {
    return { type: 'wait' }
  }
  return { type: 'rebind', empresaId, empParam }
}
