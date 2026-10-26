/** Preview ainda não enviado: some só da tela, sem chamar a API. */
export function previewImagemEhLocal(
  previewUrl: string | null | undefined,
  serverUrl?: string | null
): boolean {
  if (!previewUrl?.startsWith('blob:')) return false
  if (serverUrl == null) return true
  return previewUrl !== serverUrl
}
