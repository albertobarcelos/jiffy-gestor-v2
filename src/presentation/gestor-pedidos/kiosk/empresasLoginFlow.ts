import type { LoginEmpresaSnapshot } from '@/src/domain/types/LoginEmpresaSnapshot'

/** Cópia da lista do login para o Flow abrir a lista sem esperar o persist. */
export const STORAGE_EMPRESAS_LOGIN_FLOW = 'jiffy.flow.empresas-login'

function isSnapshot(value: unknown): value is LoginEmpresaSnapshot {
  if (!value || typeof value !== 'object') return false
  const e = value as Partial<LoginEmpresaSnapshot>
  return typeof e.id === 'string' && e.id.length > 0 && typeof e.nomeFantasia === 'string'
}

function session(): Storage | null {
  try {
    return globalThis.sessionStorage ?? null
  } catch {
    return null
  }
}

export function gravarEmpresasLoginFlow(
  empresas: readonly LoginEmpresaSnapshot[] | null | undefined
): void {
  const storage = session()
  if (!storage) return
  try {
    if (!empresas?.length) {
      storage.removeItem(STORAGE_EMPRESAS_LOGIN_FLOW)
      return
    }
    storage.setItem(STORAGE_EMPRESAS_LOGIN_FLOW, JSON.stringify(empresas))
  } catch {
    /* quota / modo privado */
  }
}

export function lerEmpresasLoginFlow(): LoginEmpresaSnapshot[] {
  const storage = session()
  if (!storage) return []
  try {
    const raw = storage.getItem(STORAGE_EMPRESAS_LOGIN_FLOW)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isSnapshot)
  } catch {
    return []
  }
}
