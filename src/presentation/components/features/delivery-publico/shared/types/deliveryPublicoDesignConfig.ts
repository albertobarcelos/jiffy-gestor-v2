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
  | 'personalizada'

export type DesignCustomColors = {
  primary: string
  primaryDark: string
  surface: string
  text: string
}

export type TypographyPresetId = 'urbana' | 'moderna' | 'classica' | 'elegante'

export type CategoryIconStyle = 'linha' | 'preenchimento'

export type DesignTabId =
  | 'cabecalho'
  | 'modelos'
  | 'cores'
  | 'tipografias'
  | 'categorias'

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
    /** Usado quando `paletaId` é `personalizada`. */
    personalizadas?: DesignCustomColors
  }
  tipografia: {
    presetId: TypographyPresetId
  }
  categorias: {
    mostrar: boolean
    /** Quando true, exibe a imagem do grupo; quando false, exibe ícones personalizáveis. */
    usarImagensGrupo: boolean
    estiloIcone: CategoryIconStyle
    iconesPorGrupoId: Record<string, string>
  }
}

export type DeliveryDesignStorage = {
  published: DeliveryPublicoDesignConfig
  draft: DeliveryPublicoDesignConfig
}
