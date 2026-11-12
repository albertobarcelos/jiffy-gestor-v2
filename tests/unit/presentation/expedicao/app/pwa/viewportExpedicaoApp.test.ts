/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest'
import {
  corChromeExpedicaoApp,
  deveImpedirOverscrollNoDocumento,
  fatosOverscrollDocumentoExpedicaoApp,
  VIEWPORT_ESCALA_APP_ENTREGADOR,
} from '@/src/presentation/expedicao/app/pwa/viewportExpedicaoApp'

afterEach(() => {
  document.body.replaceChildren()
})

function scroller(opts: { scrollTop: number; scrollHeight: number; clientHeight: number }) {
  const el = document.createElement('div')
  el.setAttribute('data-expedicao-scroll', '')
  Object.defineProperties(el, {
    scrollTop: { get: () => opts.scrollTop },
    scrollHeight: { get: () => opts.scrollHeight },
    clientHeight: { get: () => opts.clientHeight },
  })
  const filho = document.createElement('p')
  el.appendChild(filho)
  document.body.appendChild(el)
  return { el, filho }
}

describe('fatosOverscrollDocumentoExpedicaoApp', () => {
  it('marca fora da lista quando o alvo não está no scroller', () => {
    const fora = document.createElement('header')
    document.body.appendChild(fora)
    expect(fatosOverscrollDocumentoExpedicaoApp(fora)).toEqual({
      foraDaLista: true,
      noTopo: true,
      noFundo: true,
      ptr: false,
    })
    expect(fatosOverscrollDocumentoExpedicaoApp(null)).toMatchObject({ foraDaLista: true })
  })

  it('lê topo, fundo e ptr do scroller marcado', () => {
    const topo = scroller({ scrollTop: 0, scrollHeight: 800, clientHeight: 400 })
    expect(fatosOverscrollDocumentoExpedicaoApp(topo.filho)).toEqual({
      foraDaLista: false,
      noTopo: true,
      noFundo: false,
      ptr: false,
    })

    const fundo = scroller({ scrollTop: 400, scrollHeight: 800, clientHeight: 400 })
    fundo.el.setAttribute('data-expedicao-ptr', '')
    expect(fatosOverscrollDocumentoExpedicaoApp(fundo.filho)).toEqual({
      foraDaLista: false,
      noTopo: false,
      noFundo: true,
      ptr: true,
    })
  })
})

describe('deveImpedirOverscrollNoDocumento', () => {
  it('trava header e deixa PTR no topo da lista vazia', () => {
    const fora = document.createElement('header')
    document.body.appendChild(fora)
    expect(deveImpedirOverscrollNoDocumento(fora, -20)).toBe(true)

    const vazio = scroller({ scrollTop: 0, scrollHeight: 300, clientHeight: 300 })
    vazio.el.setAttribute('data-expedicao-ptr', '')
    expect(deveImpedirOverscrollNoDocumento(vazio.filho, 20)).toBe(false)
    expect(deveImpedirOverscrollNoDocumento(vazio.filho, -20)).toBe(true)
  })
})

describe('VIEWPORT_ESCALA_APP_ENTREGADOR', () => {
  it('trava a escala como app nativo', () => {
    expect(VIEWPORT_ESCALA_APP_ENTREGADOR.maximumScale).toBe(1)
    expect(VIEWPORT_ESCALA_APP_ENTREGADOR.userScalable).toBe(false)
    expect(VIEWPORT_ESCALA_APP_ENTREGADOR.initialScale).toBe(1)
  })
})

describe('corChromeExpedicaoApp', () => {
  it('separa splash/login (marca) do app autenticado (shell)', () => {
    expect(corChromeExpedicaoApp('marca')).toBe('#5b21b6')
    expect(corChromeExpedicaoApp('shell')).toBe('#f4f6f8')
  })
})
