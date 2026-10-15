import { describe, expect, it } from 'vitest'
import {
  listarMunicipiosPorEstado,
  localizarMunicipioNoEstado,
  validarCidadeNoEstado,
} from '@/src/infrastructure/ibge/ibgeLocalidadesClient'

describe('ibgeLocalidadesClient', () => {
  it('lista municípios do catálogo local', () => {
    const municipios = listarMunicipiosPorEstado('sp')

    expect(municipios.length).toBe(645)
    expect(municipios).toContainEqual({
      codigoCidadeIbge: '3550308',
      nomeCidade: 'São Paulo',
    })
  })

  it('localiza município ignorando acento e caixa', () => {
    expect(localizarMunicipioNoEstado('SAO PAULO', 'SP')).toEqual({
      codigoCidadeIbge: '3550308',
      nomeCidade: 'São Paulo',
    })
  })

  it('valida cidade a partir do catálogo', () => {
    expect(validarCidadeNoEstado('São Paulo', 'SP')).toBe(true)
    expect(validarCidadeNoEstado('Cidade Inexistente', 'SP')).toBe(false)
  })

  it('devolve lista vazia para UF ausente do catálogo', () => {
    expect(listarMunicipiosPorEstado('ZX')).toEqual([])
  })
})
