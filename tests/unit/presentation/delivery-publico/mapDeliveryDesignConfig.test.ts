import { describe, expect, it } from 'vitest'
import { createDefaultDeliveryPublicoDesignConfig } from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'
import {
  apiDesignConfigToUi,
  uiDesignConfigToApi,
} from '@/src/presentation/components/features/delivery-publico/shared/utils/mapDeliveryDesignConfig'
import { createDefaultDesignConfig } from '@/src/presentation/components/features/delivery-publico/shared/constants/defaultDesignConfig'

describe('mapDeliveryDesignConfig', () => {
  it('round-trip API ↔ UI preserva layout e paleta', () => {
    const api = createDefaultDeliveryPublicoDesignConfig('Loja')
    const ui = apiDesignConfigToUi(api, 'Fallback')
    const back = uiDesignConfigToApi(ui)

    expect(back.layoutId).toBe('basico')
    expect(back.cores.paletaId).toBe('carvao')
    expect(back.tipografia.presetId).toBe('urbana')
    expect(back.schemaVersion).toBe(1)
    expect(back.cabecalho.logoFormato).toBe('circular')
    expect(back.cabecalho.nomeExibicao).toBe('Loja')
  })

  it('UI default vira DTO com schemaVersion 1', () => {
    const ui = createDefaultDesignConfig('Minha Loja')
    const api = uiDesignConfigToApi(ui)
    expect(api.schemaVersion).toBe(1)
    expect(api.cabecalho.nomeExibicao).toBe('Minha Loja')
    expect(api.categorias.tituloGrupoFundo).toBe('imagem')
  })

  it('preenche nome fallback quando API não traz nomeExibicao', () => {
    const api = createDefaultDeliveryPublicoDesignConfig()
    const ui = apiDesignConfigToUi(api, 'Fallback Nome')
    expect(ui.cabecalho.nomeExibicao).toBe('Fallback Nome')
  })
})
