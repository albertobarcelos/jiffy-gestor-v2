/** Canais de marketplace que exibem selo no pedido. Valores já canônicos. */
const ORIGENS_SELO_MARKETPLACE = new Set(['AIQFOME', 'IFOOD'])

export function isOrigemAiqfome(origem: string | null | undefined): boolean {
  return String(origem ?? '').trim().toUpperCase() === 'AIQFOME'
}

export function isOrigemIfood(origem: string | null | undefined): boolean {
  return String(origem ?? '').trim().toUpperCase() === 'IFOOD'
}

export function temSeloCanalMarketplace(origem: string | null | undefined): boolean {
  return ORIGENS_SELO_MARKETPLACE.has(String(origem ?? '').trim().toUpperCase())
}
