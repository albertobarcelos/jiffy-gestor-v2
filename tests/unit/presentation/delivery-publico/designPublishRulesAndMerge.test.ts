import { describe, expect, it } from 'vitest'
import { createDefaultDesignConfig } from '@/src/presentation/components/features/delivery-publico/shared/constants/defaultDesignConfig'
import {
  canPublishDesign,
  getPublishDisabledReason,
} from '@/src/presentation/components/features/delivery-publico/shared/constants/designPublishRules'
import { mergeDesignConfigWithEmpresa } from '@/src/presentation/components/features/delivery-publico/shared/utils/mergeDesignConfigWithEmpresa'
import type { EmpresaPublicaDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'

describe('designPublishRules', () => {
  it('permite defaults publicáveis', () => {
    expect(canPublishDesign(createDefaultDesignConfig())).toBe(true)
    expect(getPublishDisabledReason(createDefaultDesignConfig())).toBeUndefined()
  })

  it('bloqueia layout premium com motivo', () => {
    const config = {
      ...createDefaultDesignConfig(),
      layoutId: 'vitrine' as const,
    }
    expect(canPublishDesign(config)).toBe(false)
    expect(getPublishDisabledReason(config)).toMatch(/Básico/i)
  })

  it('permite paleta personalizada', () => {
    const config = {
      ...createDefaultDesignConfig(),
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
    expect(canPublishDesign(config)).toBe(true)
  })
})

describe('mergeDesignConfigWithEmpresa', () => {
  const empresa: EmpresaPublicaDTO = {
    id: 'e1',
    nomeFantasia: 'Nome API',
    slug: 'nome-api',
    telefone: null,
    segmento: null,
    logoUrl: 'https://cdn/logo-api.png',
    bannerUrl: 'https://cdn/banner-api.png',
    endereco: null,
  }

  it('preenche nome/logo/capa vazios com dados da empresa', () => {
    const design = createDefaultDesignConfig('')
    const merged = mergeDesignConfigWithEmpresa(design, empresa)
    expect(merged.cabecalho.nomeExibicao).toBe('Nome API')
    expect(merged.cabecalho.logoUrl).toBe('https://cdn/logo-api.png')
    expect(merged.cabecalho.capaUrl).toBe('https://cdn/banner-api.png')
  })

  it('prioriza logo/capa da empresa (FK) sobre espelho do design', () => {
    const design = {
      ...createDefaultDesignConfig('Loja'),
      cabecalho: {
        ...createDefaultDesignConfig('Loja').cabecalho,
        logoUrl: 'https://cdn/logo-design.png',
        capaUrl: 'https://cdn/capa-design.png',
      },
    }
    const merged = mergeDesignConfigWithEmpresa(design, empresa)
    expect(merged.cabecalho.logoUrl).toBe('https://cdn/logo-api.png')
    expect(merged.cabecalho.capaUrl).toBe('https://cdn/banner-api.png')
    expect(merged.cabecalho.nomeExibicao).toBe('Loja')
  })

  it('usa espelho do design quando empresa não tem midia', () => {
    const empresaSemMidia: EmpresaPublicaDTO = {
      ...empresa,
      logoUrl: null,
      bannerUrl: null,
    }
    const design = {
      ...createDefaultDesignConfig('Loja'),
      cabecalho: {
        ...createDefaultDesignConfig('Loja').cabecalho,
        logoUrl: 'https://cdn/logo-design.png',
      },
    }
    const merged = mergeDesignConfigWithEmpresa(design, empresaSemMidia)
    expect(merged.cabecalho.logoUrl).toBe('https://cdn/logo-design.png')
  })
})
