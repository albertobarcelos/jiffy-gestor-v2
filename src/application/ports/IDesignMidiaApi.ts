export type MidiaPublicaDesign = {
  logoUrl: string | null
  bannerUrl: string | null
}

export interface IDesignMidiaApi {
  uploadLogo(file: File, token: string): Promise<void>
  uploadBanner(file: File, token: string): Promise<void>
  buscarMidiaPublica(slug: string): Promise<MidiaPublicaDesign>
  buscarImagensGrupos(
    grupoIds: string[],
    token: string
  ): Promise<Record<string, string | null>>
}
