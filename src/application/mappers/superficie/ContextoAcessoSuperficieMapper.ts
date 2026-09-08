import {
  criarContextoAcessoSuperficie,
  MODULO_ERP,
  MODULO_CLAIM_PEDIDOS,
  type ContextoAcessoSuperficie,
} from '@/src/domain/superficie/ContextoAcessoSuperficie'
import { Superficie } from '@/src/domain/superficie/Superficie'

type ClaimsSuperficie = Record<string, unknown>

function lerBoolean(valor: unknown): boolean | null {
  if (valor === true || valor === 'true') return true
  if (valor === false || valor === 'false') return false
  return null
}

function lerModulos(valor: unknown): string[] {
  if (!Array.isArray(valor)) return []
  return valor.map(item => String(item).trim().toLowerCase()).filter(Boolean)
}

/**
 * Traduz claims do JWT / payload de utilizador para o contexto de domínio.
 * Contrato do backend (ainda pode não enviar tudo):
 * - `modulosAcesso`: inclui `portal-pedidos` e opcionalmente `erp`
 * - `somentePortalPedidos`: boolean
 * - `portalPedidos`: boolean (claim de acesso)
 * - `superficie`: `ERP` | `PORTAL_PEDIDOS`
 */
export class ContextoAcessoSuperficieMapper {
  static fromClaims(
    claims: ClaimsSuperficie | null | undefined,
    extras: Partial<ContextoAcessoSuperficie> = {}
  ): ContextoAcessoSuperficie {
    const fonte: Record<string, unknown> = claims ?? {}
    const modulos = lerModulos(fonte.modulosAcesso)
    const claimPedidos = lerBoolean(fonte.portalPedidos)
    const somenteClaim = lerBoolean(fonte.somentePortalPedidos)
    const superficie = Superficie.tryCreate(
      typeof fonte.superficie === 'string' ? fonte.superficie : null
    )

    const somentePelaSuperficie =
      superficie?.isGestorPedidos() === true && !modulos.includes(MODULO_ERP)

    return criarContextoAcessoSuperficie({
      usuarioAtivo: lerBoolean(fonte.ativo) ?? extras.usuarioAtivo,
      modulosAcesso: extras.modulosAcesso ?? modulos,
      somentePedidos: extras.somentePedidos ?? somenteClaim ?? somentePelaSuperficie ?? false,
      claimPedidos:
        extras.claimPedidos !== undefined
          ? extras.claimPedidos
          : claimPedidos ?? (modulos.includes(MODULO_CLAIM_PEDIDOS) ? true : null),
    })
  }
}
