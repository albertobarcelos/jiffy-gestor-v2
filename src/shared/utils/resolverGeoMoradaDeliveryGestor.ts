import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import { geocodificarEnderecoViaGoogle } from '@/src/shared/utils/geolocalizacaoEnderecoShared'
import type { EnderecoMorada } from '@/src/presentation/hooks/useMoradaTelefone'

export type GeoMoradaResolvida = {
  enderecoLocalizacao: GeoJsonPoint
  providerEnderecoId?: string | null
  origem: 'google' | 'empresa'
}

/**
 * Resolve coordenadas para morada do gestor: Google forward geocode,
 * fallback opcional na geo da empresa (cidades pequenas / endereço não encontrado).
 * Nunca altera o texto do endereço — só devolve o ponto.
 */
export async function resolverGeoMoradaDeliveryGestor(params: {
  endereco: Pick<
    EnderecoMorada,
    'rua' | 'numero' | 'bairro' | 'cidade' | 'estado' | 'cep' | 'complemento'
  >
  fallbackEmpresaGeo?: GeoJsonPoint | null
}): Promise<GeoMoradaResolvida> {
  try {
    const result = await geocodificarEnderecoViaGoogle(
      {
        rua: params.endereco.rua,
        numero: params.endereco.numero,
        bairro: params.endereco.bairro,
        cidade: params.endereco.cidade,
        estado: params.endereco.estado,
        cep: params.endereco.cep,
        complemento: params.endereco.complemento,
      },
      { minimo: 'flexivel' }
    )
    return {
      enderecoLocalizacao: result.enderecoLocalizacao,
      providerEnderecoId: result.providerEnderecoId,
      origem: 'google',
    }
  } catch {
    if (params.fallbackEmpresaGeo) {
      return {
        enderecoLocalizacao: params.fallbackEmpresaGeo,
        providerEnderecoId: null,
        origem: 'empresa',
      }
    }
    throw new Error(
      'Não foi possível localizar o endereço no Google e a empresa não tem geolocalização cadastrada.'
    )
  }
}
