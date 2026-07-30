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

const viewModelComGrupoReal: DeliveryPublicoViewModel = {
  ...baseViewModel,
  grupos: [
    {
      id: 'grp-sugestoes',
      nome: DELIVERY_PUBLICO_GRUPO_SUGESTOES_NOME,
      imagemUrl: 'https://cdn.example/sugestoes.jpg',
      produtos: [],
    },
    ...baseViewModel.grupos,
  ],
}

describe('applySugestoesDaCasaVisibility', () => {
  it('não injeta Sugestões no preview sem grupo real, mesmo com switch ON', () => {
    const config = createDefaultDesignConfig()
    const result = applySugestoesDaCasaVisibility(baseViewModel, config, {
      injectPreviewFallback: true,
    })
    expect(result.grupos.every(g => g.id !== DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID)).toBe(true)
    expect(result.grupos).toHaveLength(1)
  })

  it('injeta Sugestões no preview quando existe grupo real e switch ON', () => {
    const config = createDefaultDesignConfig()
    const result = applySugestoesDaCasaVisibility(viewModelComGrupoReal, config, {
      injectPreviewFallback: true,
    })
    expect(result.grupos[0]?.id).toBe(DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID)
    expect(result.grupos[0]?.nome).toBe(DELIVERY_PUBLICO_GRUPO_SUGESTOES_NOME)
    expect(result.grupos[0]?.imagemUrl).toBe('https://cdn.example/sugestoes.jpg')
    expect(result.grupos.some(g => g.id === 'grp-sugestoes')).toBe(false)
    expect(result.grupos).toHaveLength(2)
  })

  it('remove Sugestões quando desabilitado', () => {
    const config = createDefaultDesignConfig()
    config.categorias.mostrarSugestoesDaCasa = false
    const comSugestoes = {
      ...baseViewModel,
      grupos: [buildPreviewGrupoSugestoes(baseViewModel.grupos), ...baseViewModel.grupos],
    }
    const result = applySugestoesDaCasaVisibility(comSugestoes, config)
    expect(result.grupos.every(g => g.id !== DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID)).toBe(true)
  })

  it('usa imagem do grupo real no sintético já existente', () => {
    const config = createDefaultDesignConfig()
    const comSintetico: DeliveryPublicoViewModel = {
      ...viewModelComGrupoReal,
      grupos: [
        buildPreviewGrupoSugestoes(baseViewModel.grupos, null),
        ...viewModelComGrupoReal.grupos,
      ],
    }
    const result = applySugestoesDaCasaVisibility(comSintetico, config)
    expect(result.grupos[0]?.imagemUrl).toBe('https://cdn.example/sugestoes.jpg')
    expect(result.grupos.some(g => g.id === 'grp-sugestoes')).toBe(false)
  })
})
