import { describe, expect, it } from 'vitest'
import { createDefaultDesignConfig } from '@/src/presentation/components/features/delivery-publico/shared/constants/defaultDesignConfig'
import { mergeCategoriasDesignConfig } from '@/src/presentation/components/features/delivery-publico/shared/utils/mergeCategoriasDesignConfig'
import { resolveGrupoTituloBarStyle } from '@/src/presentation/components/features/delivery-publico/shared/utils/resolveGrupoTituloBarStyle'

describe('mergeCategoriasDesignConfig', () => {
  const fallback = createDefaultDesignConfig().categorias

  it('usa defaults quando partial é indefinido', () => {
    expect(mergeCategoriasDesignConfig(undefined, fallback)).toEqual(fallback)
  })

  it('ignora chaves legadas e aplica tituloGrupoFundo/corBarraTitulo', () => {
    const merged = mergeCategoriasDesignConfig(
      {
        mostrar: false,
        usarImagensGrupo: true,
        estiloIcone: 'linha',
        iconesPorGrupoId: { a: 'pizza' },
        tituloGrupoFundo: 'imagem',
        corBarraTitulo: '#112233',
      },
      fallback
    )

    expect(merged).toEqual({
      tituloGrupoFundo: 'imagem',
      corBarraTitulo: '#112233',
      corTextoTitulo: null,
      mostrarNomeTitulo: true,
      mostrarSugestoesDaCasa: true,
    })
  })

  it('aplica corTextoTitulo personalizada', () => {
    const merged = mergeCategoriasDesignConfig(
      { corTextoTitulo: '#abcdef' },
      fallback
    )
    expect(merged.corTextoTitulo).toBe('#ABCDEF')
  })

  it('normaliza cor inválida para null', () => {
    const merged = mergeCategoriasDesignConfig(
      { corBarraTitulo: 'vermelho' },
      fallback
    )
    expect(merged.corBarraTitulo).toBeNull()
  })
})

describe('resolveGrupoTituloBarStyle', () => {
  it('modo cor usa variáveis do tema quando não há personalização', () => {
    const config = createDefaultDesignConfig()
    expect(resolveGrupoTituloBarStyle({ config, imagemUrl: '/x.jpg' })).toEqual({
      backgroundColor: 'var(--delivery-primary-dark, #171717)',
      color: 'var(--delivery-btn-text, #ffffff)',
    })
  })

  it('modo cor com personalização aplica backgroundColor e color', () => {
    const config = createDefaultDesignConfig()
    config.categorias.corBarraTitulo = '#FF0000'
    config.categorias.corTextoTitulo = '#00FF00'
    expect(resolveGrupoTituloBarStyle({ config })).toEqual({
      backgroundColor: '#FF0000',
      color: '#00FF00',
    })
  })

  it('modo imagem com URL aplica banner por cima do fundo sólido', () => {
    const config = createDefaultDesignConfig()
    config.categorias.tituloGrupoFundo = 'imagem'
    config.categorias.corTextoTitulo = '#EEEEEE'
    const style = resolveGrupoTituloBarStyle({
      config,
      imagemUrl: 'https://cdn.example/banner.jpg',
    })
    expect(style.backgroundColor).toBe('var(--delivery-primary-dark, #171717)')
    expect(style.backgroundImage).toContain('url(https://cdn.example/banner.jpg)')
    expect(style.backgroundSize).toBe('cover')
    expect(style.color).toBe('#EEEEEE')
  })

  it('modo imagem sem URL mantém fundo sólido (tema ou personalizado)', () => {
    const config = createDefaultDesignConfig()
    config.categorias.tituloGrupoFundo = 'imagem'
    config.categorias.corBarraTitulo = '#00AA00'
    expect(resolveGrupoTituloBarStyle({ config, imagemUrl: null })).toEqual({
      backgroundColor: '#00AA00',
      color: 'var(--delivery-btn-text, #ffffff)',
    })
  })
})
