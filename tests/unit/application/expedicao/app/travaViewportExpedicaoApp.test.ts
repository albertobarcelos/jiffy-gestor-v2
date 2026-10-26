import { afterEach, describe, expect, it } from 'vitest'
import { deveImpedirOverscrollDocumentoExpedicaoApp } from '@/src/application/expedicao/app/travaViewportExpedicaoApp'

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

describe('deveImpedirOverscrollDocumentoExpedicaoApp', () => {
  it('trava gesto fora da lista (header, tab bar)', () => {
    const fora = document.createElement('header')
    document.body.appendChild(fora)
    expect(deveImpedirOverscrollDocumentoExpedicaoApp({ target: fora, deltaY: -20 })).toBe(true)
    expect(deveImpedirOverscrollDocumentoExpedicaoApp({ target: null, deltaY: 10 })).toBe(true)
  })

  it('trava puxar no topo e empurrar no fundo da lista', () => {
    const topo = scroller({ scrollTop: 0, scrollHeight: 800, clientHeight: 400 })
    expect(deveImpedirOverscrollDocumentoExpedicaoApp({ target: topo.filho, deltaY: 12 })).toBe(true)
    expect(deveImpedirOverscrollDocumentoExpedicaoApp({ target: topo.filho, deltaY: -12 })).toBe(false)

    const fundo = scroller({ scrollTop: 400, scrollHeight: 800, clientHeight: 400 })
    expect(deveImpedirOverscrollDocumentoExpedicaoApp({ target: fundo.filho, deltaY: -8 })).toBe(true)
    expect(deveImpedirOverscrollDocumentoExpedicaoApp({ target: fundo.filho, deltaY: 8 })).toBe(false)
  })

  it('trava lista que não transborda (tela vazia)', () => {
    const vazio = scroller({ scrollTop: 0, scrollHeight: 300, clientHeight: 300 })
    expect(deveImpedirOverscrollDocumentoExpedicaoApp({ target: vazio.filho, deltaY: 20 })).toBe(true)
    expect(deveImpedirOverscrollDocumentoExpedicaoApp({ target: vazio.filho, deltaY: -20 })).toBe(true)
  })

  it('deixa a lista rolar no miolo', () => {
    const meio = scroller({ scrollTop: 80, scrollHeight: 800, clientHeight: 400 })
    expect(deveImpedirOverscrollDocumentoExpedicaoApp({ target: meio.filho, deltaY: -16 })).toBe(false)
    expect(deveImpedirOverscrollDocumentoExpedicaoApp({ target: meio.filho, deltaY: 16 })).toBe(false)
  })
})
