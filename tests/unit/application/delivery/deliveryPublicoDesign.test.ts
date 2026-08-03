import { describe, expect, it } from 'vitest'
import {
  createDefaultDeliveryPublicoDesignConfig,
  deliveryPublicoDesignConfigSchema,
  deliveryPublicoDesignMeResponseSchema,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'
import { validarDraftDesign } from '@/src/application/services/delivery/validarDraftDesign'
import {
  podePublicarDesign,
  validarPublicacaoDesign,
} from '@/src/application/services/delivery/validarPublicacaoDesign'

describe('deliveryPublicoDesignConfigSchema', () => {
  it('aceita defaults canônicos', () => {
    const defaults = createDefaultDeliveryPublicoDesignConfig('Loja Teste')
    const parsed = deliveryPublicoDesignConfigSchema.safeParse(defaults)
    expect(parsed.success).toBe(true)
  })

  it('exige schemaVersion 1', () => {
    const raw = {
      ...createDefaultDeliveryPublicoDesignConfig(),
      schemaVersion: 2,
    }
    expect(deliveryPublicoDesignConfigSchema.safeParse(raw).success).toBe(false)
  })

  it('exige personalizadas quando paleta é personalizada', () => {
    const raw = {
      ...createDefaultDeliveryPublicoDesignConfig(),
      cores: { paletaId: 'personalizada' },
    }
    const parsed = deliveryPublicoDesignConfigSchema.safeParse(raw)
    expect(parsed.success).toBe(false)
  })

  it('aceita personalizada com cores', () => {
    const raw = {
      ...createDefaultDeliveryPublicoDesignConfig(),
      cores: {
        paletaId: 'personalizada' as const,
        personalizadas: {
          primary: '#525252',
          primaryDark: '#171717',
          surface: '#FFFFFF',
          text: '#171A1C',
        },
      },
    }
    expect(deliveryPublicoDesignConfigSchema.safeParse(raw).success).toBe(true)
  })

  it('rejeita hex inválido', () => {
    const raw = {
      ...createDefaultDeliveryPublicoDesignConfig(),
      categorias: {
        ...createDefaultDeliveryPublicoDesignConfig().categorias,
        corBarraTitulo: '#fff',
      },
    }
    expect(deliveryPublicoDesignConfigSchema.safeParse(raw).success).toBe(false)
  })
})

describe('deliveryPublicoDesignMeResponseSchema', () => {
  it('aceita resposta me válida', () => {
    const config = createDefaultDeliveryPublicoDesignConfig()
    const parsed = deliveryPublicoDesignMeResponseSchema.safeParse({
      draft: config,
      published: config,
      publishedAt: '2026-08-03T12:00:00.000Z',
      schemaVersion: 1,
    })
    expect(parsed.success).toBe(true)
  })

  it('aceita publishedAt null', () => {
    const config = createDefaultDeliveryPublicoDesignConfig()
    const parsed = deliveryPublicoDesignMeResponseSchema.safeParse({
      draft: config,
      published: config,
      publishedAt: null,
      schemaVersion: 1,
    })
    expect(parsed.success).toBe(true)
  })
})

describe('validarDraftDesign', () => {
  it('aceita layout premium no draft', () => {
    const result = validarDraftDesign({
      ...createDefaultDeliveryPublicoDesignConfig(),
      layoutId: 'vitrine',
    })
    expect(result.ok).toBe(true)
  })

  it('rejeita config sem logoFormato', () => {
    const { cabecalho, ...rest } = createDefaultDeliveryPublicoDesignConfig()
    const result = validarDraftDesign({
      ...rest,
      cabecalho: { nomeExibicao: 'X' },
    })
    expect(result.ok).toBe(false)
  })
})

describe('validarPublicacaoDesign', () => {
  it('aceita config publicável', () => {
    const result = validarPublicacaoDesign(createDefaultDeliveryPublicoDesignConfig())
    expect(result.ok).toBe(true)
  })

  it('rejeita layout não publicável', () => {
    const result = validarPublicacaoDesign({
      ...createDefaultDeliveryPublicoDesignConfig(),
      layoutId: 'vitrine',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/Básico/i)
    }
  })

  it('rejeita paleta não publicável', () => {
    const result = validarPublicacaoDesign({
      ...createDefaultDeliveryPublicoDesignConfig(),
      cores: { paletaId: 'pessego' },
    })
    expect(result.ok).toBe(false)
  })

  it('rejeita tipografia não publicável', () => {
    const result = validarPublicacaoDesign({
      ...createDefaultDeliveryPublicoDesignConfig(),
      tipografia: { presetId: 'moderna' },
    })
    expect(result.ok).toBe(false)
  })

  it('podePublicarDesign espelha o gate', () => {
    expect(podePublicarDesign(createDefaultDeliveryPublicoDesignConfig())).toBe(true)
    expect(
      podePublicarDesign({
        ...createDefaultDeliveryPublicoDesignConfig(),
        layoutId: 'grade',
      })
    ).toBe(false)
  })
})
