import { formatarCepMascara, normalizarDigitosCep } from '@/src/shared/utils/consultaCep'

export type EnderecoPorLocalizacao = {
  rua: string
  numero: string
  bairro: string
  cidade: string
  estado: string
  cep: string
}

function obterPosicaoAtual(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocalização não suportada neste dispositivo'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60_000,
    })
  })
}

function mensagemErroGeo(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as GeolocationPositionError).code
    if (code === 1) return 'Permissão de localização negada'
    if (code === 2) return 'Não foi possível obter a localização'
    if (code === 3) return 'Tempo esgotado ao obter a localização'
  }
  if (error instanceof Error) return error.message
  return 'Erro ao obter localização'
}

/**
 * Obtém coordenadas do GPS e resolve endereço via BFF `/api/geolocalizacao/reverso`.
 */
export async function obterEnderecoPorGps(): Promise<EnderecoPorLocalizacao> {
  let position: GeolocationPosition
  try {
    position = await obterPosicaoAtual()
  } catch (error) {
    throw new Error(mensagemErroGeo(error))
  }

  const { latitude, longitude } = position.coords
  const response = await fetch(
    `/api/geolocalizacao/reverso?lat=${encodeURIComponent(String(latitude))}&lon=${encodeURIComponent(String(longitude))}`,
    { method: 'GET', headers: { Accept: 'application/json' } }
  )

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const msg =
      typeof payload.error === 'string'
        ? payload.error
        : 'Não foi possível obter o endereço pela localização'
    throw new Error(msg)
  }

  const cepDigits = normalizarDigitosCep(String(payload.cep ?? ''))

  return {
    rua: String(payload.rua ?? ''),
    numero: String(payload.numero ?? ''),
    bairro: String(payload.bairro ?? ''),
    cidade: String(payload.cidade ?? ''),
    estado: String(payload.estado ?? '').toUpperCase().slice(0, 2),
    cep: cepDigits.length === 8 ? formatarCepMascara(cepDigits) : '',
  }
}
