export type EnderecoNavegacaoApp = {
  rua?: string | null
  numero?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
  cep?: string | null
  complemento?: string | null
  latitude?: number | null
  longitude?: number | null
}

function texto(valor: unknown): string {
  return String(valor ?? '').trim()
}

function pontoValido(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  const latitude = typeof lat === 'number' ? lat : Number(lat)
  const longitude = typeof lng === 'number' ? lng : Number(lng)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null
  if (latitude === 0 && longitude === 0) return null
  return { lat: latitude, lng: longitude }
}

/** Endereço completo para Waze/Maps — o backend manda o texto, não o pin. */
export function montarEnderecoNavegacaoApp(endereco: EnderecoNavegacaoApp | null | undefined): string | null {
  if (!endereco) return null
  const ruaNumero = [texto(endereco.rua), texto(endereco.numero)].filter(Boolean).join(', ')
  const partes = [
    ruaNumero,
    texto(endereco.bairro),
    texto(endereco.cidade),
    texto(endereco.estado),
    texto(endereco.cep).replace(/\D/g, '').replace(/^(\d{5})(\d{3})$/, '$1-$2'),
  ].filter(Boolean)
  return partes.length ? partes.join(' — ') : null
}

export function hrefWazeNavegacaoApp(input: {
  endereco: string | null | undefined
  latitude?: number | null
  longitude?: number | null
}): string | null {
  const ponto = pontoValido(input.latitude, input.longitude)
  if (ponto) {
    return `https://waze.com/ul?ll=${ponto.lat},${ponto.lng}&navigate=yes`
  }
  const q = texto(input.endereco)
  if (!q) return null
  return `https://waze.com/ul?q=${encodeURIComponent(q)}&navigate=yes`
}

export function hrefGoogleMapsNavegacaoApp(input: {
  endereco: string | null | undefined
  latitude?: number | null
  longitude?: number | null
}): string | null {
  const ponto = pontoValido(input.latitude, input.longitude)
  if (ponto) {
    return `https://www.google.com/maps/dir/?api=1&destination=${ponto.lat},${ponto.lng}`
  }
  const q = texto(input.endereco)
  if (!q) return null
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`
}
