/**
 * Porta de mídia de cadastro (complemento, grupo de complemento, etc.).
 * A UI não conhece catálogo delivery vs GET de cadastro — só esta porta.
 */
export interface ICadastroImagemMedia {
  resolverLote(ids: string[], token: string): Promise<Record<string, string | null>>
  resolverUma(id: string, token: string): Promise<string | null>
  resolverDoCadastro(ids: string[], token: string): Promise<Record<string, string | null>>
  enviar(id: string, file: File, token: string): Promise<string | null>
  lembrar(id: string, url: string | null | undefined): string | null
  conhecida(id: string): string | null
}
