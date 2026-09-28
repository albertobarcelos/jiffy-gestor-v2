/** Canais de marketplace que exibem selo no pedido. Valores já canônicos. */
const ORIGENS_SELO_MARKETPLACE = new Set(['AIQFOME', 'IFOOD'])

function origemCanon(origem: string | null | undefined): string {
  return String(origem ?? '').trim().toUpperCase()
}

export function isOrigemAiqfome(origem: string | null | undefined): boolean {
  return origemCanon(origem) === 'AIQFOME'
}

export function isOrigemIfood(origem: string | null | undefined): boolean {
  return origemCanon(origem) === 'IFOOD'
}

/** Pedido do cardápio / site Jiffy. Lançamento manual do gestor não entra. */
export function isOrigemJiffyCardapio(origem: string | null | undefined): boolean {
  const o = origemCanon(origem)
  return o === 'JIFFY_DELIVERY' || o === 'DELIVERY'
}

export function temSeloCanalMarketplace(origem: string | null | undefined): boolean {
  return ORIGENS_SELO_MARKETPLACE.has(origemCanon(origem))
}

/** Selo no card: site Jiffy ou marketplace. GESTOR / PDV ficam sem selo. */
export function temSeloCanalOrigem(origem: string | null | undefined): boolean {
  return temSeloCanalMarketplace(origem) || isOrigemJiffyCardapio(origem)
}
