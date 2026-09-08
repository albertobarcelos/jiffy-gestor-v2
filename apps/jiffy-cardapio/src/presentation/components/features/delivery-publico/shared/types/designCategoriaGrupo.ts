export type DesignCategoriaGrupo = {
  id: string
  nome: string
  iconName: string
  /** Cor hex do grupo (`corHex` do endpoint de listagem). */
  cor: string
  imagemUrl: string | null
}
