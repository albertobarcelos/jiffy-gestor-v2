/** Claim JWT / `UsuarioGestor.modulosAcesso`. Contrato do backend — não alterar o valor. */
export const MODULO_CLAIM_PEDIDOS = 'portal-pedidos'

/** Se presente junto com o módulo de pedidos, o utilizador também acede ao ERP. */
export const MODULO_ERP = 'erp'

export type ContextoAcessoSuperficie = {
  usuarioAtivo: boolean
  modulosAcesso: readonly string[]
  /** Só o quadro de pedidos: bloqueia dashboard, produtos, resto do ERP. */
  somentePedidos: boolean
  /**
   * Claim explícito de acesso ao quadro de pedidos.
   * `null` = ausente (compatibilidade).
   */
  claimPedidos: boolean | null
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
    somentePedidos: input.somentePedidos === true,
    claimPedidos: input.claimPedidos === undefined ? null : input.claimPedidos,
  }
}

export function temModulo(contexto: ContextoAcessoSuperficie, modulo: string): boolean {
  const alvo = modulo.trim().toLowerCase()
  return contexto.modulosAcesso.includes(alvo)
}

export function isOperadorSomentePedidos(contexto: ContextoAcessoSuperficie): boolean {
  if (contexto.somentePedidos) return true
  const temPedidos = temModulo(contexto, MODULO_CLAIM_PEDIDOS)
  const temErp = temModulo(contexto, MODULO_ERP)
  return temPedidos && !temErp
}
