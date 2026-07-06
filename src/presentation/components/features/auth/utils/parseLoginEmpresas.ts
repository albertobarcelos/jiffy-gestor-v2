import type { LoginEmpresaSnapshot } from '@/src/domain/types/LoginEmpresaSnapshot'

/** Lista `empresas` do POST login multi-empresa (contrato hub gestor). */
export function parseEmpresasLogin(raw: unknown): LoginEmpresaSnapshot[] | null {
  if (!Array.isArray(raw)) {
    return null
  }

  const out: LoginEmpresaSnapshot[] = []

  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue
    }
    const o = item as Record<string, unknown>
    const id = typeof o.id === 'string' ? o.id.trim() : ''
    const nomeFantasia = typeof o.nomeFantasia === 'string' ? o.nomeFantasia.trim() : ''
    const cnpj = typeof o.cnpj === 'string' ? o.cnpj.trim() : ''
    const bloqueado = o.bloqueado === true

    if (!id || !nomeFantasia || !cnpj) {
      continue
    }

    out.push({ id, nomeFantasia, cnpj, bloqueado })
  }

  return out
}
