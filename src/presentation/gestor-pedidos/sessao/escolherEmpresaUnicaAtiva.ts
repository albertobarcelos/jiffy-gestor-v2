import type { LoginEmpresaSnapshot } from '@/src/domain/types/LoginEmpresaSnapshot'

/** Uma empresa ativa: dá para pular o hub. Zero ou várias: o operador escolhe. */
export function escolherEmpresaUnicaAtiva(
  empresas: readonly LoginEmpresaSnapshot[] | null | undefined
): LoginEmpresaSnapshot | null {
  const ativas = (empresas ?? []).filter(e => Boolean(e.id) && !e.bloqueado)
  return ativas.length === 1 ? ativas[0] : null
}
