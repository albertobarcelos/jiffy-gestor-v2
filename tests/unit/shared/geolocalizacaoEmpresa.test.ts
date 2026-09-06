import { describe, expect, it } from 'vitest'
import { enderecoEmpresaGeocodeMinimo, lerCamposEnderecoEmpresa } from '@/src/shared/utils/geolocalizacaoEmpresa'

describe('lerCamposEnderecoEmpresa', () => {
  it('lê rua, número, cidade e estado do payload da empresa', () => {
    const campos = lerCamposEnderecoEmpresa({
      rua: 'Av. Brasil',
      numero: '100',
      cidade: 'Nova Mutum',
      estado: 'MT',
      bairro: 'Centro',
    })
    expect(campos.rua).toBe('Av. Brasil')
    expect(campos.numero).toBe('100')
    expect(campos.cidade).toBe('Nova Mutum')
    expect(campos.estado).toBe('MT')
    expect(enderecoEmpresaGeocodeMinimo(campos)).toBe(true)
  })

  it('sem endereço não permite geocode', () => {
    expect(enderecoEmpresaGeocodeMinimo(lerCamposEnderecoEmpresa(null))).toBe(false)
  })
})
