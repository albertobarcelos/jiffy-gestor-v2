export const EXPEDICAO_APP_TECLADO_LIMIAR_PX = 120

export type FatosOverscrollExpedicaoApp = {
  foraDaLista: boolean
  noTopo: boolean
  noFundo: boolean
  ptr: boolean
  deltaY: number
}

/**
 * Com teclado aberto, o shell cabe na visualViewport.
 * Sem teclado, usa innerHeight para o Safari não saltar no scroll.
 */
export function medidasTecladoVisualViewportExpedicaoApp(input: {
  innerHeight: number
  vvHeight: number
  vvOffsetTop: number
  limiarPx?: number
}): { heightPx: number; offsetTopPx: number; tecladoAberto: boolean } {
  const limiar = input.limiarPx ?? EXPEDICAO_APP_TECLADO_LIMIAR_PX
  const tecladoAberto = input.innerHeight - input.vvHeight > limiar
  if (!tecladoAberto) {
    return { heightPx: input.innerHeight, offsetTopPx: 0, tecladoAberto: false }
  }
  return {
    heightPx: Math.round(input.vvHeight),
    offsetTopPx: Math.round(input.vvOffsetTop),
    tecladoAberto: true,
  }
}

/**
 * iOS/Android ainda rubber-band o documento quando o gesto começa no header/tab bar
 * ou quando a lista está no topo/fundo. Impede o default nesses casos.
 */
export function deveImpedirOverscrollDocumentoExpedicaoApp(
  input: FatosOverscrollExpedicaoApp
): boolean {
  if (input.foraDaLista) return true
  if (input.deltaY > 0 && input.noTopo) return !input.ptr
  if (input.deltaY < 0 && input.noFundo) return true
  return false
}

export function deveImpedirGestoPinchExpedicaoApp(quantidadeToques: number): boolean {
  return quantidadeToques > 1
}

/**
 * Pan/zoom residual do visualViewport. Não usa offsetTop: no iOS isso é o teclado.
 */
export function deveCorrigirPanVisualViewportExpedicaoApp(input: {
  scale: number
  offsetLeft: number
  windowScrollX: number
  windowScrollY: number
}): boolean {
  if (input.windowScrollX !== 0 || input.windowScrollY !== 0) return true
  if (input.scale > 1.001 || input.scale < 0.999) return true
  if (Math.abs(input.offsetLeft) > 0.5) return true
  return false
}
