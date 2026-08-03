import { describe, expect, it } from 'vitest'
import { createDefaultDeliveryPublicoDesignConfig } from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'
import type { EmpresaPublicaDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { deliveryPublicoDesignConfigSchema } from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'
import { apiDesignConfigToUi } from '@/src/presentation/components/features/delivery-publico/shared/utils/mapDeliveryDesignConfig'
import { mergeDesignConfigWithEmpresa } from '@/src/presentation/components/features/delivery-publico/shared/utils/mergeDesignConfigWithEmpresa'
import { createDefaultDesignConfig } from '@/src/presentation/components/features/delivery-publico/shared/constants/defaultDesignConfig'

/**
 * Espelha a resolução do tema público (empresa.design → UI → merge).
 */
function resolveDesignPublicoFromEmpresa(
  empresa: EmpresaPublicaDTO | null,
  nomeFallback = ''
) {
  const fallbackNome = nomeFallback || empresa?.nomeFantasia || ''
  if (empresa?.design) {
    const parsed = deliveryPublicoDesignConfigSchema.safeParse(empresa.design)
    if (parsed.success) {
      return mergeDesignConfigWithEmpresa(
        apiDesignConfigToUi(parsed.data, fallbackNome),
        empresa
      )
    }
  }
  return mergeDesignConfigWithEmpresa(
    createDefaultDesignConfig(fallbackNome),
    empresa
  )
}

describe('resolveDesignPublicoFromEmpresa', () => {
  it('usa empresa.design do catálogo', () => {
    const design = {
      ...createDefaultDeliveryPublicoDesignConfig(),
      cores: { paletaId: 'lavanda' as const },
      cabecalho: {
        logoFormato: 'quadrada' as const,
        logoUrl: 'https://cdn.exemplo.com/logo.png',
        capaUrl: 'https://cdn.exemplo.com/banner.png',
      },
    }

    const empresa: EmpresaPublicaDTO = {
      id: 'e1',
      nomeFantasia: 'Loja API',
      slug: 'loja-api',
      telefone: null,
      segmento: null,
      logoUrl: 'https://cdn.exemplo.com/logo-fk.png',
      bannerUrl: 'https://cdn.exemplo.com/banner-fk.png',
      design,
      endereco: null,
    }

    const config = resolveDesignPublicoFromEmpresa(empresa)
    expect(config.cores.paletaId).toBe('lavanda')
    expect(config.cabecalho.logoFormato).toBe('quadrada')
    // FK da empresa tem prioridade sobre espelho no design
    expect(config.cabecalho.logoUrl).toBe('https://cdn.exemplo.com/logo-fk.png')
    expect(config.cabecalho.nomeExibicao).toBe('Loja API')
  })

  it('cai em defaults quando design ausente', () => {
    const empresa: EmpresaPublicaDTO = {
      id: 'e1',
      nomeFantasia: 'Sem Design',
      slug: 'sem-design',
      telefone: null,
      segmento: null,
      logoUrl: null,
      bannerUrl: null,
      endereco: null,
    }

    const config = resolveDesignPublicoFromEmpresa(empresa)
    expect(config.layoutId).toBe('basico')
    expect(config.cores.paletaId).toBe('carvao')
    expect(config.cabecalho.nomeExibicao).toBe('Sem Design')
  })
})
