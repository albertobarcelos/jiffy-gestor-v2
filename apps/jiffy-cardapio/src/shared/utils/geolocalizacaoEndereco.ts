import { formatarCepMascara, normalizarDigitosCep } from '@/src/shared/utils/consultaCep'
import {
  backendReverseGeocode,
} from '@/src/shared/utils/geolocalizacaoBackendApi'
import { mensagemAmigavelErroGeolocalizacao } from '@/src/shared/utils/geolocalizacaoEnderecoShared'

export type EnderecoPorLocalizacao = {
  rua: string
  numero: string
  bairro: string
  cidade: string
  estado: string
  cep: string
  latitude: number
  longitude: number
  providerEnderecoId?: string | null
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

function mensagemErroGpsNavegador(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as GeolocationPositionError).code
    if (code === 1) {
      return 'Permissão de localização negada. Autorize o GPS ou busque o endereço pelo Google.'
    }
    if (code === 2) {
      return 'Não foi possível obter a localização do dispositivo. Tente buscar o endereço pelo Google.'
    }
    if (code === 3) {
      return 'Tempo esgotado ao obter a localização. Tente novamente ou busque o endereço pelo Google.'
    }
  }
  if (error instanceof Error) return error.message
  return 'Erro ao obter localização'
}

/**
 * Obtém coordenadas do GPS e resolve endereço via backend
 * `GET /api/v1/geolocalizacao/reverso`.
 */
export async function obterEnderecoPorGps(): Promise<EnderecoPorLocalizacao> {
  let position: GeolocationPosition
  try {
    position = await obterPosicaoAtual()
  } catch (error) {
    throw new Error(mensagemAmigavelErroGeolocalizacao(mensagemErroGpsNavegador(error), 'gps'))
  }

  const { latitude, longitude } = position.coords
  try {
    const lookup = await backendReverseGeocode(latitude, longitude)
    const cepDigits = normalizarDigitosCep(lookup.cep)

    return {
      rua: lookup.rua,
      numero: lookup.numero,
      bairro: lookup.bairro,
      cidade: lookup.cidade,
      estado: lookup.estado,
      cep: cepDigits.length === 8 ? formatarCepMascara(cepDigits) : '',
      latitude,
      longitude,
      providerEnderecoId: lookup.providerEnderecoId,
    }
  } catch (error) {
    throw new Error(mensagemAmigavelErroGeolocalizacao(error, 'gps'))
  }
}
