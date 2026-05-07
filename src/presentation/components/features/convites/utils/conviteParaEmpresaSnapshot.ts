import type { LoginEmpresaSnapshot } from '@/src/domain/types/LoginEmpresaSnapshot'
import type { ConvitePendente } from '@/src/presentation/components/features/convites/types'

/** Snapshot de empresa após aceitar convite (CNPJ pode vir em novo login). */
export function conviteParaEmpresaSnapshot(convite: ConvitePendente): LoginEmpresaSnapshot {
  return {
    id: convite.empresaId,
    nomeFantasia: convite.nomeEmpresa,
    cnpj: '—',
    bloqueado: false,
  }
}
