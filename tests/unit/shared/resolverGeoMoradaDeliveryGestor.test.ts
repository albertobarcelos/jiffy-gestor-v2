import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resolverGeoMoradaDeliveryGestor } from '@/src/shared/utils/resolverGeoMoradaDeliveryGestor'

vi.mock('@/src/shared/utils/geolocalizacaoEnderecoShared', async importOriginal => {
  const actual = await importOriginal<typeof import('@/src/shared/utils/geolocalizacaoEnderecoShared')>()
  return {
    ...actual,
    geocodificarEnderecoViaGoogle: vi.fn(),
  }
})

import { geocodificarEnderecoViaGoogle } from '@/src/shared/utils/geolocalizacaoEnderecoShared'

const pontoGoogle = {
  type: 'Point' as const,
  coordinates: [-54.61, -20.45] as [number, number],
}

const pontoEmpresa = {
  type: 'Point' as const,
  coordinates: [-54.6, -20.4] as [number, number],
}

const endereco = {
  rua: 'Rua Particular',
  numero: '16',
  bairro: 'Centro',
  cidade: 'Piquete',
  estado: 'SP',
  cep: '',
}

describe('resolverGeoMoradaDeliveryGestor', () => {
  beforeEach(() => {
    vi.mocked(geocodificarEnderecoViaGoogle).mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('devolve o ponto do Google sem reescrever o texto do endereço', async () => {
    vi.mocked(geocodificarEnderecoViaGoogle).mockResolvedValue({
      enderecoLocalizacao: pontoGoogle,
      providerEnderecoId: 'ChIJxxx',
      enderecoFormatado: 'Rua que o Google inventou, Piquete - SP',
    })

    const result = await resolverGeoMoradaDeliveryGestor({ endereco })

    expect(result.origem).toBe('google')
    expect(result.enderecoLocalizacao).toEqual(pontoGoogle)
    expect(result.providerEnderecoId).toBe('ChIJxxx')
    expect(result).not.toHaveProperty('rua')
  })

  it('usa a geo da empresa quando o Google não encontra o endereço', async () => {
    vi.mocked(geocodificarEnderecoViaGoogle).mockRejectedValue(
      new Error('Endereço não encontrado.')
    )

    const result = await resolverGeoMoradaDeliveryGestor({
      endereco,
      fallbackEmpresaGeo: pontoEmpresa,
    })

    expect(result.origem).toBe('empresa')
    expect(result.enderecoLocalizacao).toEqual(pontoEmpresa)
    expect(result.providerEnderecoId).toBeNull()
  })

  it('falha só quando Google e empresa não têm ponto', async () => {
    vi.mocked(geocodificarEnderecoViaGoogle).mockRejectedValue(
      new Error('Endereço não encontrado.')
    )

    await expect(resolverGeoMoradaDeliveryGestor({ endereco })).rejects.toThrow(
      /empresa não tem geolocalização/i
    )
  })
})
