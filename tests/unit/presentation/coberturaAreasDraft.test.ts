import { describe, expect, it } from 'vitest'
import { montarSalvarAreasCobertura } from '@/src/presentation/components/features/configuracoes/coberturaAreasDraft'
import type { AreaEntregaDTO } from '@/src/application/dto/delivery/CoberturaEntregaDTO'
import { pathsDeCirculo } from '@/src/shared/utils/geoJsonCircle'

const areaBase: AreaEntregaDTO = {
  id: 'a1',
  nome: 'Centro',
  area: {
    type: 'Polygon',
    coordinates: [
      [
        [-46.63, -23.55],
        [-46.62, -23.55],
        [-46.62, -23.56],
        [-46.63, -23.56],
        [-46.63, -23.55],
      ],
    ],
  },
  valorTaxa: 8,
  tempoEntregaInMinutes: 45,
  ativo: true,
  dataCriacao: '2026-01-01T00:00:00.000Z',
  dataAtualizacao: '2026-01-01T00:00:00.000Z',
}

describe('montarSalvarAreasCobertura', () => {
  it('monta criação a partir de rascunho de círculo', () => {
    const paths = pathsDeCirculo({ lat: -23.55, lng: -46.63 }, 400)
    const resultado = montarSalvarAreasCobertura({
      areas: [],
      taxasAreaDraft: {},
      prazosAreaDraft: {},
      ativosAreaDraft: {},
      geometriasAreaDraft: {},
      areasCriacaoDraft: [{ id: 'r1', paths, forma: 'circulo' }],
    })
    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return
    expect(resultado.patches).toHaveLength(0)
    expect(resultado.criacoes).toHaveLength(1)
    expect(resultado.criacoes[0].area.type).toBe('Polygon')
  })

  it('rejeita taxa inválida', () => {
    const resultado = montarSalvarAreasCobertura({
      areas: [areaBase],
      taxasAreaDraft: { a1: 'abc' },
      prazosAreaDraft: {},
      ativosAreaDraft: {},
      geometriasAreaDraft: {},
      areasCriacaoDraft: [],
    })
    expect(resultado.ok).toBe(false)
    if (resultado.ok) return
    expect(resultado.erro).toMatch(/Taxa inválida/)
  })
})
