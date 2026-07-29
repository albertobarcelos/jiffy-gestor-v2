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
  it('injeta Sugestões no preview quando habilitado', () => {
    const config = createDefaultDesignConfig()
    const result = applySugestoesDaCasaVisibility(baseViewModel, config, {
      injectPreviewFallback: true,
    })
    expect(result.grupos[0]?.id).toBe(DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID)
    expect(result.grupos[0]?.nome).toBe(DELIVERY_PUBLICO_GRUPO_SUGESTOES_NOME)
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
})
