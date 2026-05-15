/**
 * Trecho curto de URL derivado do nome fantasia / razão da empresa.
 * Ex.: "Nexsyn Ltda" → "nexsyn"; "Arena Guanabara" → "arena".
 */
export function empresaNomeParaSlugUrl(nomeBruto: string): string {
  const trimmed = nomeBruto.trim()
  if (!trimmed) {
    return 'empresa'
  }

  const normalized = trimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  const tokens = normalized.split(/[\s\-_/.,]+/).filter(Boolean)

  const ehTokenDeSufixo = (t: string) => {
    const x = t.replace(/\.$/, '')
    return (
      x === 'ltda' ||
      x === 'me' ||
      x === 'epp' ||
      x === 'sa' ||
      x === 's.a' ||
      x === 's/a' ||
      x === 'eireli' ||
      x === 'ss' ||
      x === 'filial'
    )
  }

  const nucleo = (t: string) => t.replace(/[^a-z0-9]/g, '')

  let chosen =
    tokens.find(t => !ehTokenDeSufixo(t) && nucleo(t).length >= 2) ??
    tokens.find(t => nucleo(t).length > 0) ??
    null

  if (!chosen) {
    return 'empresa'
  }

  const slug = nucleo(chosen).slice(0, 40)
  return slug.length > 0 ? slug : 'empresa'
}
