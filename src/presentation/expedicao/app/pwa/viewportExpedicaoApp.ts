import {
  deveImpedirOverscrollDocumentoExpedicaoApp,
  type FatosOverscrollExpedicaoApp,
} from '@/src/application/expedicao/app/travaViewportExpedicaoApp'

export type ChromeExpedicaoApp = 'marca' | 'shell'

export const EXPEDICAO_APP_VIEWPORT_CLASS = 'expedicao-app-viewport'
export const EXPEDICAO_APP_SCROLL_SEL = '[data-expedicao-scroll]'
export const EXPEDICAO_APP_PTR_ATTR = 'data-expedicao-ptr'
export const EXPEDICAO_APP_VV_HEIGHT = '--expedicao-vv-height'
export const EXPEDICAO_APP_VV_OFFSET_TOP = '--expedicao-vv-offset-top'
export const EXPEDICAO_APP_CHROME_MARCA = '#5b21b6'
export const EXPEDICAO_APP_CHROME_SHELL = '#f4f6f8'
export const EXPEDICAO_APP_CHROME_CLASS_MARCA = 'expedicao-app-chrome-marca'

/** Meta viewport do PWA: escala travada. Android respeita; iOS cai na trava CSS/JS. */
export const VIEWPORT_ESCALA_APP_ENTREGADOR = {
  width: 'device-width' as const,
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover' as const,
}

export function corChromeExpedicaoApp(chrome: ChromeExpedicaoApp): string {
  return chrome === 'marca' ? EXPEDICAO_APP_CHROME_MARCA : EXPEDICAO_APP_CHROME_SHELL
}

export function fatosOverscrollDocumentoExpedicaoApp(
  target: EventTarget | null
): Omit<FatosOverscrollExpedicaoApp, 'deltaY'> {
  if (!(target instanceof Element)) {
    return { foraDaLista: true, noTopo: true, noFundo: true, ptr: false }
  }

  const scroller = target.closest(EXPEDICAO_APP_SCROLL_SEL)
  if (!(scroller instanceof HTMLElement)) {
    return { foraDaLista: true, noTopo: true, noFundo: true, ptr: false }
  }

  const { scrollTop, scrollHeight, clientHeight } = scroller
  return {
    foraDaLista: false,
    noTopo: scrollTop <= 0,
    noFundo: scrollTop + clientHeight >= scrollHeight - 1,
    ptr: scroller.hasAttribute(EXPEDICAO_APP_PTR_ATTR),
  }
}

export function deveImpedirOverscrollNoDocumento(
  target: EventTarget | null,
  deltaY: number
): boolean {
  return deveImpedirOverscrollDocumentoExpedicaoApp({
    ...fatosOverscrollDocumentoExpedicaoApp(target),
    deltaY,
  })
}
