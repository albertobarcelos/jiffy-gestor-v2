import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  listarMunicipiosPorEstado,
  localizarMunicipioNoEstado,
  validarCidadeNoEstado,
} from '@/src/infrastructure/ibge/ibgeLocalidadesClient'

function respostaOk(body: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => body,
  }
}

describe('ibgeLocalidadesClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('lista municípios pela BrasilAPI no servidor', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      respostaOk([{ nome: 'Cuiabá', codigo_ibge: '5103403' }])
    )
    vi.stubGlobal('fetch', fetchMock)

    const municipios = await listarMunicipiosPorEstado('ZX')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/api/ibge/municipios/v1/ZX')
    expect(municipios).toEqual([{ codigoCidadeIbge: '5103403', nomeCidade: 'Cuiabá' }])
  })

  it('localiza município ignorando acento e caixa', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        respostaOk([{ nome: 'Lucas do Rio Verde', codigo_ibge: '5105259' }])
      )
    )

    const municipio = await localizarMunicipioNoEstado('LUCAS DO RIO VERDE', 'ZZ')
    expect(municipio).toEqual({
      codigoCidadeIbge: '5105259',
      nomeCidade: 'Lucas do Rio Verde',
    })
  })

  it('valida cidade a partir da lista carregada', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(respostaOk([{ nome: 'Sinop', codigo_ibge: '5107909' }]))
    )

    await expect(validarCidadeNoEstado('Sinop', 'ZY')).resolves.toBe(true)
    await expect(validarCidadeNoEstado('Cuiabá', 'ZY')).resolves.toBe(false)
  })
})
