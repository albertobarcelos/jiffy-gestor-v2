/** Módulo em `UsuarioGestor.modulosAcesso` e/ou claim JWT. */
export const MODULO_PORTAL_PEDIDOS = 'portal-pedidos'

/** Se presente junto com o portal, o utilizador também acede ao ERP. */
export const MODULO_ERP = 'erp'

export type ContextoAcessoSuperficie = {
  usuarioAtivo: boolean
  modulosAcesso: readonly string[]
  /** Só o portal: bloqueia dashboard, produtos, Kanban ERP, etc. */
  somentePortalPedidos: boolean
  /**
   * Claim explícito de acesso ao portal.
   * `null` = ausente (compatibilidade).
   */
  claimPortalPedidos: boolean | null
}

export function criarContextoAcessoSuperficie(
  input: Partial<ContextoAcessoSuperficie> = {}
): ContextoAcessoSuperficie {
  const modulos = (input.modulosAcesso ?? [])
    .map(item => String(item).trim().toLowerCase())
    .filter(Boolean)

  return {
    usuarioAtivo: input.usuarioAtivo !== false,
    modulosAcesso: modulos,
    somentePortalPedidos: input.somentePortalPedidos === true,
    claimPortalPedidos:
      input.claimPortalPedidos === undefined ? null : input.claimPortalPedidos,
  }
}

export function temModulo(contexto: ContextoAcessoSuperficie, modulo: string): boolean {
  const alvo = modulo.trim().toLowerCase()
  return contexto.modulosAcesso.includes(alvo)
}

export function isOperadorSomentePortal(contexto: ContextoAcessoSuperficie): boolean {
  if (contexto.somentePortalPedidos) return true
  const temPortal = temModulo(contexto, MODULO_PORTAL_PEDIDOS)
  const temErp = temModulo(contexto, MODULO_ERP)
  return temPortal && !temErp
}
