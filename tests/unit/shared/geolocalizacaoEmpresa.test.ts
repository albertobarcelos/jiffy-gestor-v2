import { describe, expect, it, vi } from 'vitest'
import { geoJsonPointFromLatLng } from '@/src/shared/types/geoJsonPoint'
import {
  assinaturaEnderecoEmpresaGeocode,
  enderecoEmpresaGeocodeMinimo,
  geocodificarEnderecoEmpresaViaGoogle,
  lerCamposEnderecoEmpresa,
  montarTentativasGeocodeEmpresa,
  raioAjustePinPorPrecisao,
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
        pinEscolhidoNestaEdicao: false,
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
        pinEscolhidoNestaEdicao: false,
      })
    ).toEqual({ acao: 'geocodificar' })
  })

  it('geocodifica quando a cidade muda e o pin só estava alinhado porque a tela carregou', () => {
    expect(
      resolverPinAoSalvarEmpresa({
        enderecoAtual: NOVA_MUTUM,
        enderecoSalvo: BARRA_DO_BUGRES,
        pinAtual: PIN_BARRA,
        providerEnderecoId: 'old',
        pinEscolhidoNestaEdicao: false,
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
        pinEscolhidoNestaEdicao: true,
      })
    ).toEqual({
      acao: 'manter',
      point: pinPlaces,
      providerEnderecoId: 'ChIJ_novo',
    })
  })

  it('não bloqueia o save da empresa quando o endereço está incompleto', () => {
    const r = resolverPinAoSalvarEmpresa({
      enderecoAtual: { rua: '', numero: '', cidade: 'NOVA MUTUM', estado: 'MT' },
      enderecoSalvo: BARRA_DO_BUGRES,
      pinAtual: PIN_BARRA,
      providerEnderecoId: null,
      pinEscolhidoNestaEdicao: false,
    })
    expect(r.acao).toBe('pular')
  })

  it('geocodifica se ainda não há pin', () => {
    expect(
      resolverPinAoSalvarEmpresa({
        enderecoAtual: NOVA_MUTUM,
        enderecoSalvo: null,
        pinAtual: null,
        providerEnderecoId: null,
        pinEscolhidoNestaEdicao: false,
      })
    ).toEqual({ acao: 'geocodificar' })
  })
})

describe('montarTentativasGeocodeEmpresa', () => {
  it('depois do endereço completo tenta a rua sem CEP e por último a cidade', () => {
    const tentativas = montarTentativasGeocodeEmpresa({
      rua: 'RUA ANIBAL ROQUE',
      numero: '100',
      bairro: 'VILA CRISTIANA',
      cidade: 'PIQUETE',
      estado: 'SP',
      cep: '12620-302',
    })
    expect(tentativas.map(t => t.precisao)).toEqual(['endereco', 'rua', 'cep', 'cep', 'cidade'])
    expect(tentativas[1]?.campos).toEqual({
      rua: 'RUA ANIBAL ROQUE',
      bairro: 'VILA CRISTIANA',
      cidade: 'PIQUETE',
      estado: 'SP',
    })
    expect(tentativas[4]?.campos).toEqual({ cidade: 'PIQUETE', estado: 'SP' })
  })
})

describe('geocodificarEnderecoEmpresaViaGoogle', () => {
  const piquete = {
    rua: 'RUA ANIBAL ROQUE',
    numero: '100',
    bairro: 'VILA CRISTIANA',
    cidade: 'PIQUETE',
    estado: 'SP',
    cep: '12620302',
  }
  const pontoRua = geoJsonPointFromLatLng(-22.6175, -45.1773)

  it('aproxima pela rua quando o endereço com número e CEP não existe', async () => {
    const buscar = vi.fn(async (campos: { numero?: string; cep?: string; rua?: string }) => {
      if (campos.numero || campos.cep) {
        throw new Error('Endereço não encontrado no provedor de geocoding')
      }
      return {
        providerEnderecoId: 'place-rua',
        enderecoLocalizacao: pontoRua,
        enderecoFormatado: 'R. Aníbal Roque, Piquete - SP',
        rua: 'Rua Aníbal Roque',
        numero: '',
        bairro: '',
        cidade: 'Piquete',
        estado: 'SP',
        cep: '12620000',
      }
    })

    const resultado = await geocodificarEnderecoEmpresaViaGoogle(piquete, buscar)
    expect(resultado.precisao).toBe('rua')
    expect(resultado.enderecoLocalizacao).toEqual(pontoRua)
    expect(raioAjustePinPorPrecisao(resultado.precisao)).toBe(5000)
  })

  it('cai na cidade se a rua também não for encontrada', async () => {
    const pontoCidade = geoJsonPointFromLatLng(-22.6138, -45.1771)
    const buscar = vi.fn(async (campos: { rua?: string; cep?: string; cidade?: string }) => {
      if (campos.rua || campos.cep) {
        throw new Error('Endereço não encontrado')
      }
      return {
        providerEnderecoId: 'place-cidade',
        enderecoLocalizacao: pontoCidade,
        enderecoFormatado: 'Piquete - SP',
        rua: '',
        numero: '',
        bairro: '',
        cidade: 'Piquete',
        estado: 'SP',
        cep: '',
      }
    })

    const resultado = await geocodificarEnderecoEmpresaViaGoogle(piquete, buscar)
    expect(resultado.precisao).toBe('cidade')
    expect(resultado.enderecoLocalizacao).toEqual(pontoCidade)
  })
})
