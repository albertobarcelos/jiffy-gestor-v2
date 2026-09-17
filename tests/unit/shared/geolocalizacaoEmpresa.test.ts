import { describe, expect, it } from 'vitest'
import { geoJsonPointFromLatLng } from '@/src/shared/types/geoJsonPoint'
import {
  assinaturaEnderecoEmpresaGeocode,
  enderecoEmpresaGeocodeMinimo,
  lerCamposEnderecoEmpresa,
  resolverPinAoSalvarEmpresa,
} from '@/src/shared/utils/geolocalizacaoEmpresa'

const BARRA_DO_BUGRES = {
  rua: 'AV HITLER SANSAO',
  numero: '0',
  bairro: 'RESIDENCIAL DOS IPES',
  cidade: 'BARRA DO BUGRES',
  estado: 'MT',
  cep: '78390000',
}

const NOVA_MUTUM = {
  rua: 'AV DAS TORRES',
  numero: '100',
  bairro: 'CENTRO',
  cidade: 'NOVA MUTUM',
  estado: 'MT',
  cep: '78450000',
}

const PIN_BARRA = geoJsonPointFromLatLng(-15.072, -57.187)

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

describe('assinaturaEnderecoEmpresaGeocode', () => {
  it('ignora caixa e complemento', () => {
    expect(
      assinaturaEnderecoEmpresaGeocode({
        ...BARRA_DO_BUGRES,
        complemento: 'SALA 01',
      })
    ).toBe(
      assinaturaEnderecoEmpresaGeocode({
        ...BARRA_DO_BUGRES,
        rua: 'av hitler sansao',
        complemento: 'OUTRO',
      })
    )
  })

  it('muda quando a cidade muda', () => {
    expect(assinaturaEnderecoEmpresaGeocode(BARRA_DO_BUGRES)).not.toBe(
      assinaturaEnderecoEmpresaGeocode({ ...BARRA_DO_BUGRES, cidade: 'NOVA MUTUM' })
    )
  })
})

describe('resolverPinAoSalvarEmpresa', () => {
  it('geocodifica quando a cidade muda e o pin ainda é o antigo', () => {
    expect(
      resolverPinAoSalvarEmpresa({
        enderecoAtual: NOVA_MUTUM,
        enderecoSalvo: BARRA_DO_BUGRES,
        pinAtual: PIN_BARRA,
        providerEnderecoId: 'old',
        pinAlinhadoAoFormulario: false,
      })
    ).toEqual({ acao: 'geocodificar' })
  })

  it('geocodifica de novo mesmo se o texto do endereço já estava salvo (pin antigo)', () => {
    expect(
      resolverPinAoSalvarEmpresa({
        enderecoAtual: NOVA_MUTUM,
        enderecoSalvo: NOVA_MUTUM,
        pinAtual: PIN_BARRA,
        providerEnderecoId: 'old',
        pinAlinhadoAoFormulario: true,
      })
    ).toEqual({ acao: 'geocodificar' })
  })

  it('mantém o pin do Places quando o operador acabou de escolher o endereço', () => {
    const pinPlaces = geoJsonPointFromLatLng(-13.83, -56.08)
    expect(
      resolverPinAoSalvarEmpresa({
        enderecoAtual: NOVA_MUTUM,
        enderecoSalvo: BARRA_DO_BUGRES,
        pinAtual: pinPlaces,
        providerEnderecoId: 'ChIJ_novo',
        pinAlinhadoAoFormulario: true,
      })
    ).toEqual({
      acao: 'manter',
      point: pinPlaces,
      providerEnderecoId: 'ChIJ_novo',
    })
  })

  it('bloqueia save sem rua/número/cidade/estado quando precisa geocodificar', () => {
    const r = resolverPinAoSalvarEmpresa({
      enderecoAtual: { rua: '', numero: '', cidade: 'NOVA MUTUM', estado: 'MT' },
      enderecoSalvo: BARRA_DO_BUGRES,
      pinAtual: PIN_BARRA,
      providerEnderecoId: null,
      pinAlinhadoAoFormulario: false,
    })
    expect(r.acao).toBe('bloquear')
  })

  it('geocodifica se ainda não há pin', () => {
    expect(
      resolverPinAoSalvarEmpresa({
        enderecoAtual: NOVA_MUTUM,
        enderecoSalvo: null,
        pinAtual: null,
        providerEnderecoId: null,
        pinAlinhadoAoFormulario: false,
      })
    ).toEqual({ acao: 'geocodificar' })
  })
})
