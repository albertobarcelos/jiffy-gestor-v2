import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resolverGeoMoradaDeliveryGestor } from '@/src/shared/utils/resolverGeoMoradaDeliveryGestor'

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
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('devolve o ponto do Google sem reescrever o texto do endereço', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        enderecoLocalizacao: pontoGoogle,
        providerEnderecoId: 'ChIJxxx',
        enderecoFormatado: 'Rua que o Google inventou, Piquete - SP',
      }),
    } as Response)

    const result = await resolverGeoMoradaDeliveryGestor({ endereco })

    expect(result.origem).toBe('google')
    expect(result.enderecoLocalizacao).toEqual(pontoGoogle)
    expect(result.providerEnderecoId).toBe('ChIJxxx')
    expect(result).not.toHaveProperty('rua')
  })

  it('usa a geo da empresa quando o Google não encontra o endereço', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Endereço não encontrado.' }),
    } as Response)

    const result = await resolverGeoMoradaDeliveryGestor({
      endereco,
      fallbackEmpresaGeo: pontoEmpresa,
    })

    expect(result.origem).toBe('empresa')
    expect(result.enderecoLocalizacao).toEqual(pontoEmpresa)
    expect(result.providerEnderecoId).toBeNull()
  })

  it('falha só quando Google e empresa não têm ponto', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Endereço não encontrado.' }),
    } as Response)

    await expect(resolverGeoMoradaDeliveryGestor({ endereco })).rejects.toThrow(
      /empresa não tem geolocalização/i
    )
  })
})
