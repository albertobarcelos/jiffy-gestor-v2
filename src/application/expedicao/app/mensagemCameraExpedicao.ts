/** Safari/iOS só libera getUserMedia em contexto seguro (HTTPS ou localhost). */
export function mensagemErroCameraExpedicao(error: unknown): string {
  const insecure =
    typeof window !== 'undefined' &&
    window.isSecureContext === false

  if (insecure) {
    return 'No iPhone a câmera só funciona em HTTPS. Em HTTP da rede local o Safari bloqueia sem pedir permissão — digite o código abaixo ou use um túnel HTTPS.'
  }

  const name =
    error && typeof error === 'object' && 'name' in error
      ? String((error as { name?: string }).name)
      : ''

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Permissão da câmera negada. Em Ajustes → Safari → Câmera, permita o acesso e tente de novo — ou digite o código.'
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'Nenhuma câmera encontrada. Digite o código abaixo.'
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'A câmera está em uso por outro app. Feche e tente de novo, ou digite o código.'
  }

  if (typeof navigator !== 'undefined' && !navigator.mediaDevices?.getUserMedia) {
    return 'Este navegador não libera a câmera neste endereço. Digite o código abaixo.'
  }

  return 'Não deu para abrir a câmera. Digite o código abaixo.'
}

export function cameraDisponivelNesteContexto(): boolean {
  if (typeof window === 'undefined') return false
  if (window.isSecureContext === false) return false
  return typeof navigator.mediaDevices?.getUserMedia === 'function'
}
