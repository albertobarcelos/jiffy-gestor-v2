const PREFIXO = 'jiffy.cardapio.menuId.'

export type MenuCardapioSessaoItem = {
  id: string
  tipo?: string | null
}

export function chaveMenuCardapioSessao(empresaId: string): string {
  return `${PREFIXO}${empresaId.trim()}`
}

export function lerMenuCardapioSessao(empresaId: string): string | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const valor = sessionStorage.getItem(chaveMenuCardapioSessao(empresaId))
    return valor?.trim() || null
  } catch {
    return null
  }
}

export function gravarMenuCardapioSessao(empresaId: string, menuId: string): void {
  if (typeof sessionStorage === 'undefined') return
  const id = menuId.trim()
  if (!empresaId.trim() || !id) return
  try {
    sessionStorage.setItem(chaveMenuCardapioSessao(empresaId), id)
  } catch {
    /* ignore */
  }
}

/** Remove a escolha de cardápio (logout / troca de empresa). */
export function limparMenusCardapioSessao(): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    const remover: string[] = []
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const chave = sessionStorage.key(i)
      if (chave?.startsWith(PREFIXO)) remover.push(chave)
    }
    remover.forEach(chave => sessionStorage.removeItem(chave))
  } catch {
    /* ignore */
  }
}

export function idMenuPrincipal(menus: readonly MenuCardapioSessaoItem[]): string | null {
  const principal = menus.find(m => String(m.tipo ?? '').toLowerCase() === 'principal')
  return principal?.id ?? menus[0]?.id ?? null
}

/**
 * Escolha da sessão se ainda existir na lista; senão o Principal (ou o primeiro).
 */
export function resolverMenuCardapioInicial(params: {
  empresaId: string | null
  menus: readonly MenuCardapioSessaoItem[]
}): string | null {
  if (params.menus.length === 0) return null
  const ids = new Set(params.menus.map(m => m.id))
  if (params.empresaId) {
    const gravado = lerMenuCardapioSessao(params.empresaId)
    if (gravado && ids.has(gravado)) return gravado
  }
  return idMenuPrincipal(params.menus)
}
