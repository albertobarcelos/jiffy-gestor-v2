import { beforeEach, describe, expect, it, vi } from 'vitest'
import { consultarCodigoCidadeIbge } from '@/src/presentation/utils/consultarCodigoCidadeIbge'
import { fetchGestorApi } from '@/src/infrastructure/api/fetchGestorApi'

vi.mock('@/src/infrastructure/api/fetchGestorApi', () => ({
  fetchGestorApi: vi.fn(),
}))

const fetchGestorApiMock = vi.mocked(fetchGestorApi)

describe('consultarCodigoCidadeIbge', () => {
  beforeEach(() => {
    fetchGestorApiMock.mockReset()
  })

  it('devolve o código quando o BFF valida a cidade', async () => {
    fetchGestorApiMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          valido: true,
          codigoCidadeIbge: '5105259',
          nomeCidade: 'Lucas do Rio Verde',
        }),
        { status: 200 }
      )
    )

    await expect(consultarCodigoCidadeIbge('Lucas do Rio Verde', 'MT')).resolves.toBe('5105259')
    expect(fetchGestorApiMock).toHaveBeenCalledWith(
      '/api/v1/ibge/validar-cidade?cidade=Lucas+do+Rio+Verde&uf=MT',
      expect.objectContaining({ cache: 'no-store' })
    )
  })

  it('devolve null quando a cidade não existe no estado', async () => {
    fetchGestorApiMock.mockResolvedValue(
      new Response(JSON.stringify({ valido: false, codigoCidadeIbge: null }), { status: 200 })
    )

    await expect(consultarCodigoCidadeIbge('Cidade Inventada', 'MT')).resolves.toBeNull()
  })
})
