import type { SuperficieQuadroPedidos } from '@/src/presentation/gestor-pedidos/superficieQuadroPedidos'

/** Arquivo em `public/sounds/`. Troque por um .mp3 com o mesmo nome se quiser outro timbre. */
export const SOM_PEDIDO_NOVO_URL = '/sounds/pedido-novo.wav'

export const STORAGE_FREDY_SOM_PEDIDOS_SILENCIADO = 'jiffy-fredy:som-pedidos-silenciado'

export function deveTocarSomPedidoNovo(input: {
  superficie: SuperficieQuadroPedidos
  silenciado: boolean
}): boolean {
  return input.superficie === 'fredy' && !input.silenciado
}

export function lerSomPedidosSilenciado(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STORAGE_FREDY_SOM_PEDIDOS_SILENCIADO) === '1'
  } catch {
    return false
  }
}

export function gravarSomPedidosSilenciado(silenciado: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_FREDY_SOM_PEDIDOS_SILENCIADO, silenciado ? '1' : '0')
  } catch {
    /* quota / modo privado */
  }
}

let audioPedidoNovo: HTMLAudioElement | null = null

function obterAudioPedidoNovo(): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null
  if (!audioPedidoNovo) {
    audioPedidoNovo = new Audio(SOM_PEDIDO_NOVO_URL)
    audioPedidoNovo.preload = 'auto'
  }
  return audioPedidoNovo
}

/** Primeiro clique no Fredy destrava autoplay do WebView. */
export function prepararSomPedidoNovo(): void {
  const audio = obterAudioPedidoNovo()
  if (!audio) return
  audio.muted = true
  void audio.play().then(() => {
    audio.pause()
    audio.currentTime = 0
    audio.muted = false
  }).catch(() => {
    audio.muted = false
  })
}

export function tocarSomPedidoNovo(): void {
  const audio = obterAudioPedidoNovo()
  if (!audio) return
  audio.muted = false
  audio.currentTime = 0
  void audio.play().catch(() => {
    /* autoplay bloqueado até um clique */
  })
}
