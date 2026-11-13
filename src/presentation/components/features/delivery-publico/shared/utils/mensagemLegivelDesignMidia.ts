function statusDoErro(error: unknown): number | undefined {
  if (!error || typeof error !== 'object' || !('status' in error)) return undefined
  const status = (error as { status?: unknown }).status
  return typeof status === 'number' ? status : undefined
}

export function mensagemLegivelDesignMidia(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  if (statusDoErro(error) === 404) {
    return 'Não foi possível enviar a imagem deste item. Recarregue a página e tente novamente.'
  }
  if (/INVALID_MIME_TYPE/i.test(message)) {
    return 'O conteúdo da imagem não corresponde ao formato informado. Salve novamente como JPEG, PNG ou WebP.'
  }
  if (/failed to fetch/i.test(message)) {
    return 'Não foi possível concluir o upload. Verifique sua conexão e tente novamente.'
  }
  if (message.trim()) return message
  return 'Não foi possível enviar a imagem.'
}
