import { describe, expect, it } from 'vitest'
import { createDefaultDeliveryPublicoDesignConfig } from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'
import { validarDraftDesign } from '@/src/application/services/delivery/validarDraftDesign'
import { validarPublicacaoDesign } from '@/src/application/services/delivery/validarPublicacaoDesign'
import {
  apiDesignConfigToUi,
  uiDesignConfigToApi,
} from '@/src/application/mappers/DeliveryDesignConfigMapper'

describe('validarDraftDesign', () => {
  it('aceita o default canônico', () => {
    const defaults = createDefaultDeliveryPublicoDesignConfig('Loja')
    expect(validarDraftDesign(defaults).layoutId).toBe('basico')
  })

  it('rejeita layout inválido', () => {
    const defaults = createDefaultDeliveryPublicoDesignConfig()
    expect(() =>
      validarDraftDesign({ ...defaults, layoutId: 'inexistente' })
    ).toThrow()
  })
})

describe('validarPublicacaoDesign', () => {
  it('libera layouts/paletas/tipografias canônicos', () => {
    const config = createDefaultDeliveryPublicoDesignConfig()
    expect(
      validarPublicacaoDesign({
        ...config,
        layoutId: 'vitrine',
        cores: { paletaId: 'hortela' },
        tipografia: { presetId: 'elegante' },
      }).layoutId
    ).toBe('vitrine')
  })
})

describe('DeliveryDesignConfigMapper', () => {
  it('remove blob/data ao ir para a API', () => {
    const ui = apiDesignConfigToUi(createDefaultDeliveryPublicoDesignConfig('X'), 'X')
    const api = uiDesignConfigToApi({
      ...ui,
      cabecalho: {
        ...ui.cabecalho,
        logoUrl: 'blob:http://localhost/abc',
        capaUrl: 'data:image/png;base64,aaa',
      },
    })
    expect(api.cabecalho.logoUrl).toBeNull()
    expect(api.cabecalho.capaUrl).toBeNull()
  })

  it('preserva URL http no round-trip', () => {
    const dto = createDefaultDeliveryPublicoDesignConfig('Loja')
    const withUrl = {
      ...dto,
      cabecalho: {
        ...dto.cabecalho,
        logoUrl: 'https://cdn.example/logo.png',
        capaUrl: 'https://cdn.example/capa.jpg',
      },
    }
    const ui = apiDesignConfigToUi(withUrl, 'Loja')
    const back = uiDesignConfigToApi(ui)
    expect(back.cabecalho.logoUrl).toBe('https://cdn.example/logo.png')
    expect(back.cabecalho.capaUrl).toBe('https://cdn.example/capa.jpg')
  })
})
