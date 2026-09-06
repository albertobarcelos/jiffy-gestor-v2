import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  erroGeocodeForwardParaCliente,
  fetchGeocodeForward,
  GOOGLE_MAPS_UNAVAILABLE_CODE,
  isFalhaServicoMapaGoogle,
  MapaGoogleIndisponivelError,
  MENSAGEM_MAPA_INDISPONIVEL_SUPORTE,
  resetGoogleMapsFalhaForTests,
} from '@/src/shared/utils/googleMapsFalha'

describe('googleMapsFalha', () => {
  beforeEach(() => {
    resetGoogleMapsFalhaForTests()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    resetGoogleMapsFalhaForTests()
  })

  it('reconhece falha de serviço do Google sem expor o texto técnico', () => {
    expect(isFalhaServicoMapaGoogle(new MapaGoogleIndisponivelError())).toBe(true)
    expect(
      isFalhaServicoMapaGoogle(
        'This API key is not authorized to use this service or API. Please check the API restrictions'
      )
    ).toBe(true)
    expect(isFalhaServicoMapaGoogle('REQUEST_DENIED')).toBe(true)
    expect(isFalhaServicoMapaGoogle('Endereço não encontrado. Confira rua, número, CEP e cidade.')).toBe(
      false
    )
  })

  it('converte recusa do Google em mensagem humana para o cliente', () => {
    const erro = erroGeocodeForwardParaCliente(
      {
        error: MENSAGEM_MAPA_INDISPONIVEL_SUPORTE,
        errorCode: GOOGLE_MAPS_UNAVAILABLE_CODE,
        googleStatus: 'REQUEST_DENIED',
      },
      502
    )
    expect(erro).toBeInstanceOf(MapaGoogleIndisponivelError)
    expect(erro.message).toBe(MENSAGEM_MAPA_INDISPONIVEL_SUPORTE)
    expect(erro.message).not.toMatch(/not authorized/i)
  })

  it('não trata endereço inexistente como mapa fora do ar', () => {
    const erro = erroGeocodeForwardParaCliente(
      { error: 'Endereço não encontrado. Confira rua, número, CEP e cidade.' },
      404
    )
    expect(erro).not.toBeInstanceOf(MapaGoogleIndisponivelError)
    expect(erro.message).toContain('Endereço não encontrado')
  })

  it('reusa a mesma requisição in-flight e não tenta de novo após o serviço falhar', async () => {
    let resolvers = 0
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>(resolve => {
          resolvers += 1
          queueMicrotask(() => {
            resolve({
              ok: false,
              status: 502,
              json: async () => ({
                error: MENSAGEM_MAPA_INDISPONIVEL_SUPORTE,
                errorCode: GOOGLE_MAPS_UNAVAILABLE_CODE,
                googleStatus: 'REQUEST_DENIED',
              }),
            } as Response)
          })
        })
    )
    vi.stubGlobal('fetch', fetchMock)

    const params = new URLSearchParams({ rua: 'Av. Brasil', numero: '100', cidade: 'Cuiabá', estado: 'MT' })
    const [a, b] = await Promise.all([fetchGeocodeForward(params), fetchGeocodeForward(params)])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(a.ok).toBe(false)
    expect(b.ok).toBe(false)

    const terceira = await fetchGeocodeForward(params)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(terceira.status).toBe(503)
    expect(terceira.payload).toMatchObject({ errorCode: GOOGLE_MAPS_UNAVAILABLE_CODE })
    expect(resolvers).toBe(1)
  })
})
