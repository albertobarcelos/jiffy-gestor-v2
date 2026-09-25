import { describe, expect, it } from 'vitest'
import { createDefaultDesignConfig } from '@/src/presentation/components/features/delivery-publico/shared/constants/defaultDesignConfig'
import {
  DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID,
  DELIVERY_PUBLICO_GRUPO_SUGESTOES_NOME,
} from '@/src/presentation/components/features/delivery-publico/shared/constants/deliveryPublicoSugestoes'
import {
  applySugestoesDaCasaVisibility,
  buildPreviewGrupoSugestoes,
} from '@/src/presentation/components/features/delivery-publico/shared/utils/applySugestoesDaCasaVisibility'
import type { DeliveryPublicoViewModel } from '@/src/presentation/components/features/delivery-publico/shared/types/deliveryPublicoViewModel'

const baseViewModel: DeliveryPublicoViewModel = {
  grupos: [
    {
      id: 'lanches',
      nome: 'LANCHES',
      produtos: [
        {
          id: 'p1',
          nome: 'X-Burger',
          descricao: null,
          preco: 20,
          imagemUrl: null,
          grupoId: 'lanches',
          temComplementos: false,
        },
      ],
    },
  ],
  disponivel: true,
  horarioTexto: '',
  termoBusca: '',
  carrinho: { total: 0, quantidadeItens: 0 },
}

describe('applySugestoesDaCasaVisibility', () => {
  it('injeta Sugestões no preview sem exigir grupo portador', () => {
    const config = createDefaultDesignConfig()
    const result = applySugestoesDaCasaVisibility(baseViewModel, config, {
      injectPreviewFallback: true,
    })
    expect(result.grupos[0]?.id).toBe(DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID)
    expect(result.grupos[0]?.nome).toBe(DELIVERY_PUBLICO_GRUPO_SUGESTOES_NOME)
    expect(result.grupos).toHaveLength(2)
  })

  it('não injeta Sugestões no público sem sintético e sem preview fallback', () => {
    const config = createDefaultDesignConfig()
    const result = applySugestoesDaCasaVisibility(baseViewModel, config)
    expect(result.grupos.every(g => g.id !== DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID)).toBe(true)
    expect(result.grupos).toHaveLength(1)
  })

  it('oculta sintético sem produtos', () => {
    const config = createDefaultDesignConfig()
    const comVazio: DeliveryPublicoViewModel = {
      ...baseViewModel,
      grupos: [
        {
          id: DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID,
          nome: DELIVERY_PUBLICO_GRUPO_SUGESTOES_NOME,
          produtos: [],
        },
        ...baseViewModel.grupos,
      ],
    }
    const result = applySugestoesDaCasaVisibility(comVazio, config)
    expect(result.grupos.every(g => g.id !== DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID)).toBe(true)
  })

  it('usa imagem legada do design no sintético existente', () => {
    const config = createDefaultDesignConfig()
    config.categorias.sugestoesDaCasaImagemUrl = 'https://cdn.example/sugestoes.jpg'
    const comSintetico: DeliveryPublicoViewModel = {
      ...baseViewModel,
      grupos: [buildPreviewGrupoSugestoes(baseViewModel.grupos, null), ...baseViewModel.grupos],
    }
    const result = applySugestoesDaCasaVisibility(comSintetico, config)
    expect(result.grupos[0]?.imagemUrl).toBe('https://cdn.example/sugestoes.jpg')
  })
})
