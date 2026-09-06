import { describe, expect, it } from 'vitest'
import {
  estiloOverlayCobertura,
  raioAlcanceMaximo,
  anelDaFaixaKm,
  resolverDestaqueCobertura,
} from '@/src/shared/utils/coberturaMapaDestaque'

describe('coberturaMapaDestaque', () => {
  it('prioriza a área em edição de forma', () => {
    const r = resolverDestaqueCobertura({
      hover: { tipo: 'area', id: 'a-hover' },
      areaFormaEditandoId: 'a-edit',
      areaEditandoId: 'a-modal',
    })
    expect(r.areaDestacadaId).toBe('a-edit')
    expect(r.destacarTodasAreas).toBe(false)
  })

  it('destaca o raio sob o mouse', () => {
    const r = resolverDestaqueCobertura({
      hover: { tipo: 'raio', id: 'r1' },
      areaFormaEditandoId: null,
      areaEditandoId: null,
    })
    expect(r.raioDestacadoId).toBe('r1')
    expect(r.areaDestacadaId).toBeNull()
  })

  it('destaca todas as áreas no hover do cabeçalho', () => {
    const r = resolverDestaqueCobertura({
      hover: { tipo: 'areas', id: null },
      areaFormaEditandoId: null,
      areaEditandoId: null,
    })
    expect(r.destacarTodasAreas).toBe(true)
    expect(r.areaDestacadaId).toBeNull()
  })

  it('reforça o overlay destacado e diminui os demais', () => {
    const destacado = estiloOverlayCobertura({
      ativo: true,
      destacado: true,
      haDestaqueAtivo: true,
      variante: 'raio',
    })
    const demais = estiloOverlayCobertura({
      ativo: true,
      destacado: false,
      haDestaqueAtivo: true,
      variante: 'raio',
    })
    expect(destacado.fillOpacity).toBeGreaterThan(demais.fillOpacity)
    expect(destacado.strokeWeight).toBeGreaterThan(demais.strokeWeight)
  })

  it('escolhe o maior raio como alcance máximo', () => {
    const alcance = raioAlcanceMaximo([
      { id: 'r1', distanciaMaximaEmMetros: 1000 },
      { id: 'r4', distanciaMaximaEmMetros: 4000 },
      { id: 'r8', distanciaMaximaEmMetros: 8000 },
    ])
    expect(alcance?.id).toBe('r8')
  })

  it('a faixa Até 3 km é o anel entre 2 km e 3 km', () => {
    const raios = [
      { id: 'r1', distanciaMaximaEmMetros: 1000 },
      { id: 'r2', distanciaMaximaEmMetros: 2000 },
      { id: 'r3', distanciaMaximaEmMetros: 3000 },
    ]
    expect(anelDaFaixaKm(raios, 'r3')).toEqual({ innerMetros: 2000, outerMetros: 3000 })
    expect(anelDaFaixaKm(raios, 'r1')).toEqual({ innerMetros: 0, outerMetros: 1000 })
  })
})
