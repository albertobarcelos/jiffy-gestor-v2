import { describe, expect, it } from 'vitest'
import {
  aplicarReverseGeocodeNoPreview,
  descreverCamposGeocodeFaltantes,
  enderecoGeocodeMinimo,
  enderecoGeocodeMinimoFlexivel,
  enriquecerEnderecoParaGeocode,
  limparLogradouroEnderecoGeocode,
  mesclarEnderecoComReverseGeocode,
  montarPayloadGeoEnderecoDelivery,
  reverseGeocodeTemLogradouro,
} from '@/src/shared/utils/geolocalizacaoEnderecoShared'

const pontoA = {
  type: 'Point' as const,
  coordinates: [-46.6333, -23.5505] as [number, number],
}

const pontoB = {
  type: 'Point' as const,
  coordinates: [-46.64, -23.56] as [number, number],
}

describe('geolocalizacaoEnderecoShared', () => {
  it('exige UF no modo strict', () => {
    expect(
      enderecoGeocodeMinimo({
        rua: 'Rua Particular',
        numero: '16',
        cidade: 'Piquete',
        bairro: 'Vila Cristiana',
      })
    ).toBe(false)
  })

  it('libera geocode flexível com rua, número e bairro', () => {
    expect(
      enderecoGeocodeMinimoFlexivel({
        rua: 'Rua Particular',
        numero: '16',
        bairro: 'Vila Cristiana',
        cidade: 'Piquete',
      })
    ).toBe(true)
  })

  it('completa UF ausente com fallback da loja na mesma cidade', () => {
    const enriquecido = enriquecerEnderecoParaGeocode(
      { rua: 'Rua A', numero: '1', cidade: 'Primavera do Leste' },
      { cidade: 'Primavera do Leste', estado: 'MT' }
    )
    expect(enriquecido.estado).toBe('MT')
    expect(enderecoGeocodeMinimo(enriquecido)).toBe(true)
  })

  it('não aplica UF da loja quando a cidade do cliente é diferente', () => {
    const enriquecido = enriquecerEnderecoParaGeocode(
      { rua: 'Rua Particular', numero: '16', cidade: 'Piquete', bairro: 'Vila Cristiana' },
      { cidade: 'Primavera do Leste', estado: 'MT' }
    )
    expect(enriquecido.estado).toBeUndefined()
    expect(enriquecido.cidade).toBe('Piquete')
  })

  it('descreve campos faltantes no modo flexível', () => {
    expect(
      descreverCamposGeocodeFaltantes({ rua: '', numero: '1' }, 'flexivel')
    ).toContain('rua')
  })

  it('salva pin como preferencia quando modo preferencia_entrega', () => {
    const payload = montarPayloadGeoEnderecoDelivery({
      enderecoLocalizacao: pontoA,
      pinPosition: pontoB,
      modoAjustePin: 'preferencia_entrega',
    })
    expect(payload.preferenciaEntrega).toEqual(pontoB)
  })

  it('usa pin como enderecoLocalizacao quando modo atualizar_endereco', () => {
    const payload = montarPayloadGeoEnderecoDelivery({
      enderecoLocalizacao: pontoA,
      pinPosition: pontoB,
      providerEnderecoId: 'place-123',
      modoAjustePin: 'atualizar_endereco',
    })
    expect(payload.enderecoLocalizacao.coordinates).toEqual(pontoB.coordinates)
    expect(payload.enderecoLocalizacao.geocoding?.enderecoId).toBe('place-123')
    expect(payload.preferenciaEntrega).toBeUndefined()
  })

  it('mescla reverse geocode preservando complemento do cadastro', () => {
    const merged = mesclarEnderecoComReverseGeocode(
      {
        rua: 'Rua Errada',
        numero: '1',
        bairro: 'Centro',
        cidade: 'Piquete',
        estado: '',
        cep: '',
        complemento: 'Casa azul',
      },
      {
        rua: 'Rua Correta',
        numero: '16',
        bairro: 'Vila Cristiana',
        cidade: 'Piquete',
        estado: 'SP',
        cep: '12620000',
      }
    )
    expect(merged.rua).toBe('Rua Correta')
    expect(merged.complemento).toBe('Casa azul')
    expect(merged.estado).toBe('SP')
  })

  it('detecta logradouro útil no reverse', () => {
    expect(reverseGeocodeTemLogradouro({ rua: 'Rua Anibal Roque', numero: '10' })).toBe(true)
    expect(reverseGeocodeTemLogradouro({ rua: '', numero: '10' })).toBe(false)
    expect(reverseGeocodeTemLogradouro({ rua: 'A', numero: '10' })).toBe(false)
  })

  it('limpa logradouro mantendo cidade/UF no preview', () => {
    const limpo = limparLogradouroEnderecoGeocode(
      {
        rua: 'Rua Anibal Roque',
        numero: '100',
        bairro: 'Centro',
        cidade: 'Piquete',
        estado: 'SP',
        cep: '12620-000',
        complemento: 'Fundos',
      },
      true
    )
    expect(limpo.rua).toBe('')
    expect(limpo.numero).toBe('')
    expect(limpo.bairro).toBe('')
    expect(limpo.cep).toBe('')
    expect(limpo.cidade).toBe('Piquete')
    expect(limpo.estado).toBe('SP')
    expect(limpo.complemento).toBe('Fundos')
  })

  it('não reaproveita rua anterior quando reverse não reconhece logradouro', () => {
    const aplicado = aplicarReverseGeocodeNoPreview(
      {
        rua: 'Rua Anibal Roque',
        numero: '50',
        bairro: 'Centro',
        cidade: 'Piquete',
        estado: 'SP',
        cep: '12620000',
      },
      {
        rua: '',
        numero: '',
        bairro: '',
        cidade: 'Piquete',
        estado: 'SP',
      }
    )
    expect(aplicado.reconheceuLogradouro).toBe(false)
    expect(aplicado.endereco.rua).toBe('')
    expect(aplicado.endereco.numero).toBe('')
    expect(aplicado.endereco.cidade).toBe('Piquete')
  })

  it('aplica rua do reverse quando reconhecida', () => {
    const aplicado = aplicarReverseGeocodeNoPreview(
      {
        rua: 'Rua Antiga',
        numero: '1',
        bairro: 'X',
        cidade: 'Piquete',
        estado: 'SP',
        complemento: 'Ap 2',
      },
      {
        rua: 'Rua Nova',
        numero: '20',
        bairro: 'Centro',
        cidade: 'Piquete',
        estado: 'SP',
        cep: '12620000',
      }
    )
    expect(aplicado.reconheceuLogradouro).toBe(true)
    expect(aplicado.endereco.rua).toBe('Rua Nova')
    expect(aplicado.endereco.numero).toBe('20')
    expect(aplicado.endereco.complemento).toBe('Ap 2')
  })
})
