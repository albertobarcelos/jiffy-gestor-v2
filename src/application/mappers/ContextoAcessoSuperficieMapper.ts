import {
  criarContextoAcessoSuperficie,
  MODULO_ERP,
  MODULO_PORTAL_PEDIDOS,
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
 * Contrato (backend ainda pode não enviar tudo):
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
    const claimPortal = lerBoolean(fonte.portalPedidos)
    const somenteClaim = lerBoolean(fonte.somentePortalPedidos)
    const superficie = Superficie.tryCreate(
      typeof fonte.superficie === 'string' ? fonte.superficie : null
    )

    const somentePelaSuperficie =
      superficie?.isPortalPedidos() === true && !modulos.includes(MODULO_ERP)

    return criarContextoAcessoSuperficie({
      usuarioAtivo: lerBoolean(fonte.ativo) ?? extras.usuarioAtivo,
      modulosAcesso: extras.modulosAcesso ?? modulos,
      somentePortalPedidos:
        extras.somentePortalPedidos ?? somenteClaim ?? somentePelaSuperficie ?? false,
      claimPortalPedidos:
        extras.claimPortalPedidos !== undefined
          ? extras.claimPortalPedidos
          : claimPortal ?? (modulos.includes(MODULO_PORTAL_PEDIDOS) ? true : null),
    })
  }
}
