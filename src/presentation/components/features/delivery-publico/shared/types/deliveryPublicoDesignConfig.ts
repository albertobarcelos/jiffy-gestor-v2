export type DeliveryLayoutId = 'basico' | 'vitrine' | 'grade' | 'catalogo'

export type DeliveryLogoFormato = 'circular' | 'quadrada'

export type ColorPaletteId =
  | 'pessego'
  | 'canela'
  | 'cereja'
  | 'gergelim'
  | 'mirtilo'
  | 'lavanda'
  | 'hortela'
  | 'chocolate'
  | 'mostarda'
  | 'carvao'

export type TypographyPresetId = 'urbana' | 'moderna' | 'classica' | 'elegante'

export type CategoryIconStyle = 'linha' | 'preenchimento'

export type ElementosDestaqueCorFundoModo = 'principal' | 'personalizada'

export type DesignTabId =
  | 'cabecalho'
  | 'modelos'
  | 'cores'
  | 'tipografias'
  | 'categorias'
  | 'elementos-destaque'

export type DeliveryPublicoDesignConfig = {
  layoutId: DeliveryLayoutId
  cabecalho: {
    nomeExibicao: string
    logoUrl: string | null
    logoFormato: DeliveryLogoFormato
    capaUrl: string | null
  }
  cores: {
    paletaId: ColorPaletteId
  }
  tipografia: {
    presetId: TypographyPresetId
  }
  categorias: {
    mostrar: boolean
    estiloIcone: CategoryIconStyle
    iconesPorGrupoId: Record<string, string>
  }
  elementosDestaque: {
    corFundoModo: ElementosDestaqueCorFundoModo
    corFundoPersonalizada: string
    carrosselAtivo: boolean
    imagensDesktop: string[]
    imagensMobile: string[]
    usarImagensMobileDistintas: boolean
  }
}

export type DeliveryDesignStorage = {
  published: DeliveryPublicoDesignConfig
  draft: DeliveryPublicoDesignConfig
}
