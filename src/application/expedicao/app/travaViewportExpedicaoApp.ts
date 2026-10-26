export const EXPEDICAO_APP_VIEWPORT_CLASS = 'expedicao-app-viewport'

/** Só estes nós podem receber pan vertical; o restante do documento fica travado. */
export const EXPEDICAO_APP_SCROLL_SEL = '[data-expedicao-scroll]'

/**
 * iOS/Android ainda rubber-band o documento quando o gesto começa no header/tab bar
 * ou quando a lista está no topo/fundo. Impede o default nesses casos.
 */
export function deveImpedirOverscrollDocumentoExpedicaoApp(input: {
  target: EventTarget | null
  deltaY: number
}): boolean {
  const alvo = input.target
  if (!(alvo instanceof Element)) return true

  const scroller = alvo.closest(EXPEDICAO_APP_SCROLL_SEL)
  if (!(scroller instanceof HTMLElement)) return true

  const { scrollTop, scrollHeight, clientHeight } = scroller
  const noTopo = scrollTop <= 0
  const noFundo = scrollTop + clientHeight >= scrollHeight - 1

  if (input.deltaY > 0 && noTopo) return true
  if (input.deltaY < 0 && noFundo) return true
  return false
}
