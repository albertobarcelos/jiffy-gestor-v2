import { describe, expect, it } from 'vitest'
import { montarPayloadPatchPinEmpresa } from '@/src/application/delivery/montarPayloadPatchPinEmpresa'
import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'

const pin: GeoJsonPoint = {
  type: 'Point',
  coordinates: [-56.08, -13.83],
}

describe('montarPayloadPatchPinEmpresa', () => {
  it('preserva endereço textual e troca só a geo', () => {
    const payload = montarPayloadPatchPinEmpresa(
      {
        id: 'emp-1',
        endereco: {
          rua: 'Av. Brasil',
          numero: '100',
          cidade: 'Cuiabá',
          estado: 'MT',
          complemento: '',
        },
      },
      pin,
      'place-1'
    )

    expect(payload.empresaId).toBe('emp-1')
    expect(payload.endereco).toMatchObject({
      rua: 'Av. Brasil',
      numero: '100',
      cidade: 'Cuiabá',
      estado: 'MT',
      enderecoLocalizacao: pin,
      geocodingProvider: 'GOOGLE',
      providerEnderecoId: 'place-1',
    })
    expect(payload.endereco.complemento).toBeUndefined()
  })

  it('falha sem id da empresa', () => {
    expect(() => montarPayloadPatchPinEmpresa({ endereco: {} }, pin)).toThrow(
      'Não foi possível identificar a empresa.'
    )
  })
})
