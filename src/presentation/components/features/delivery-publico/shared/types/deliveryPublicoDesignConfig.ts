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

/** Fundo da barra de título do grupo (layout Básico). */
export type GrupoTituloFundoMode = 'cor' | 'imagem'

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
    /**
     * `cor` = fundo sólido (tema ou `corBarraTitulo`).
     * `imagem` = banner do grupo (`imagemUrl`); sem imagem, usa a cor.
     */
    tituloGrupoFundo: GrupoTituloFundoMode
    /**
     * Cor global da barra de título. `null` = usar `--delivery-primary-dark` do tema.
     */
    corBarraTitulo: string | null
    /**
     * Cor global do nome do grupo na barra. `null` = usar `--delivery-btn-text` do tema.
     */
    corTextoTitulo: string | null
    /**
     * Se false, oculta o texto do nome na barra (útil quando o banner já traz o nome).
     */
    mostrarNomeTitulo: boolean
    /** Exibe o grupo fixo "Sugestões da Casa" no início do cardápio. */
    mostrarSugestoesDaCasa: boolean
    /**
     * Banner do grupo fixo Sugestões da Casa (modo imagem).
     * Armazenado no design — não há entidade de grupo no cardápio.
     */
    sugestoesDaCasaImagemUrl: string | null
  }
}

export type DeliveryDesignStorage = {
  published: DeliveryPublicoDesignConfig
  draft: DeliveryPublicoDesignConfig
}
