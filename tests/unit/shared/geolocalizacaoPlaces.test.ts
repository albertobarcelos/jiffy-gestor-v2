import { describe, expect, it } from 'vitest'
import { parseGoogleAddressComponents } from '@/src/shared/utils/googleAddressComponents'
import {
  criarSessionTokenPlaces,
  placeDetailsParaEnderecoGeocode,
} from '@/src/shared/utils/geolocalizacaoPlaces'
import { montarPayloadGeoEnderecoDelivery } from '@/src/shared/utils/geolocalizacaoEnderecoShared'
import { moradaDtoParaEnderecoDeliveryPayload } from '@/src/application/mappers/ClienteDeliveryMoradaMapper'

describe('parseGoogleAddressComponents', () => {
  it('extrai campos BR de address_components (legado)', () => {
    const parsed = parseGoogleAddressComponents([
      { long_name: '16', short_name: '16', types: ['street_number'] },
      { long_name: 'Rua Particular', short_name: 'Rua Particular', types: ['route'] },
      { long_name: 'Vila Cristiana', short_name: 'Vila Cristiana', types: ['sublocality_level_1'] },
      { long_name: 'Piquete', short_name: 'Piquete', types: ['administrative_area_level_2'] },
      { long_name: 'São Paulo', short_name: 'SP', types: ['administrative_area_level_1'] },
      { long_name: '12620-000', short_name: '12620-000', types: ['postal_code'] },
      { long_name: 'Brasil', short_name: 'BR', types: ['country'] },
    ])

    expect(parsed.rua).toBe('Rua Particular')
    expect(parsed.numero).toBe('16')
    expect(parsed.bairro).toBe('Vila Cristiana')
    expect(parsed.cidade).toBe('Piquete')
    expect(parsed.estado).toBe('SP')
    expect(parsed.cep).toBe('12620000')
  })

  it('extrai campos BR de addressComponents (Places New)', () => {
    const parsed = parseGoogleAddressComponents([
      { longText: '16', shortText: '16', types: ['street_number'] },
      { longText: 'Rua Particular', shortText: 'Rua Particular', types: ['route'] },
      { longText: 'Vila Cristiana', shortText: 'Vila Cristiana', types: ['sublocality_level_1'] },
      { longText: 'Piquete', shortText: 'Piquete', types: ['administrative_area_level_2'] },
      { longText: 'São Paulo', shortText: 'SP', types: ['administrative_area_level_1'] },
      { longText: '12620-000', shortText: '12620-000', types: ['postal_code'] },
    ])

    expect(parsed.rua).toBe('Rua Particular')
    expect(parsed.numero).toBe('16')
    expect(parsed.cidade).toBe('Piquete')
    expect(parsed.estado).toBe('SP')
  })
})

describe('geolocalizacaoPlaces helpers', () => {
  it('cria session token não vazio', () => {
    expect(criarSessionTokenPlaces().length).toBeGreaterThan(8)
  })

  it('mapeia place details para EnderecoGeocodeInput', () => {
    const fields = placeDetailsParaEnderecoGeocode({
      providerEnderecoId: 'ChIJ_test',
      enderecoLocalizacao: { type: 'Point', coordinates: [-45.18, -22.61] },
      enderecoFormatado: null,
      rua: 'Rua A',
      numero: '10',
      bairro: 'Centro',
      cidade: 'Piquete',
      estado: 'SP',
      cep: '12620000',
    })
    expect(fields.estado).toBe('SP')
    expect(fields.cep).toContain('12620')
  })
})

describe('place_id no payload geo', () => {
  const ponto = {
    type: 'Point' as const,
    coordinates: [-45.18, -22.61] as [number, number],
  }

  it('mantém place_id ao atualizar endereço quando providerEnderecoId existe', () => {
    const payload = montarPayloadGeoEnderecoDelivery({
      enderecoLocalizacao: ponto,
      providerEnderecoId: 'ChIJ_place',
    })
    expect(payload.enderecoLocalizacao.geocoding?.enderecoId).toBe('ChIJ_place')
    expect(payload.preferenciaEntrega).toBeUndefined()
  })
})

describe('moradaDtoParaEnderecoDeliveryPayload', () => {
  it('inclui geo e place_id quando presentes', () => {
    const payload = moradaDtoParaEnderecoDeliveryPayload({
      telefone: '12991912571',
      tipoEtiqueta: 'casa',
      endereco: {
        cep: '12620000',
        rua: 'Rua A',
        numero: '10',
        bairro: 'Centro',
        cidade: 'Piquete',
        estado: 'SP',
        enderecoLocalizacao: { type: 'Point', coordinates: [-45.18, -22.61] },
        providerEnderecoId: 'ChIJ_morada',
      },
    })

    expect(payload.enderecoLocalizacao).toEqual({
      type: 'Point',
      coordinates: [-45.18, -22.61],
      geocoding: { provider: 'GOOGLE', enderecoId: 'ChIJ_morada' },
    })
  })
})
