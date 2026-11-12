import { describe, expect, it } from 'vitest'
import {
  deveCorrigirPanVisualViewportExpedicaoApp,
  deveImpedirGestoPinchExpedicaoApp,
  deveImpedirOverscrollDocumentoExpedicaoApp,
  medidasTecladoVisualViewportExpedicaoApp,
} from '@/src/application/expedicao/app/travaViewportExpedicaoApp'

describe('deveImpedirOverscrollDocumentoExpedicaoApp', () => {
  it('trava gesto fora da lista (header, tab bar)', () => {
    expect(
      deveImpedirOverscrollDocumentoExpedicaoApp({
        foraDaLista: true,
        noTopo: true,
        noFundo: true,
        ptr: false,
        deltaY: -20,
      })
    ).toBe(true)
  })

  it('trava puxar no topo e empurrar no fundo da lista', () => {
    expect(
      deveImpedirOverscrollDocumentoExpedicaoApp({
        foraDaLista: false,
        noTopo: true,
        noFundo: false,
        ptr: false,
        deltaY: 12,
      })
    ).toBe(true)
    expect(
      deveImpedirOverscrollDocumentoExpedicaoApp({
        foraDaLista: false,
        noTopo: true,
        noFundo: false,
        ptr: false,
        deltaY: -12,
      })
    ).toBe(false)
    expect(
      deveImpedirOverscrollDocumentoExpedicaoApp({
        foraDaLista: false,
        noTopo: false,
        noFundo: true,
        ptr: false,
        deltaY: -8,
      })
    ).toBe(true)
    expect(
      deveImpedirOverscrollDocumentoExpedicaoApp({
        foraDaLista: false,
        noTopo: false,
        noFundo: true,
        ptr: false,
        deltaY: 8,
      })
    ).toBe(false)
  })

  it('trava lista que não transborda (tela vazia)', () => {
    expect(
      deveImpedirOverscrollDocumentoExpedicaoApp({
        foraDaLista: false,
        noTopo: true,
        noFundo: true,
        ptr: false,
        deltaY: 20,
      })
    ).toBe(true)
    expect(
      deveImpedirOverscrollDocumentoExpedicaoApp({
        foraDaLista: false,
        noTopo: true,
        noFundo: true,
        ptr: false,
        deltaY: -20,
      })
    ).toBe(true)
  })

  it('deixa puxar para atualizar no topo da lista marcada', () => {
    expect(
      deveImpedirOverscrollDocumentoExpedicaoApp({
        foraDaLista: false,
        noTopo: true,
        noFundo: true,
        ptr: true,
        deltaY: 20,
      })
    ).toBe(false)
    expect(
      deveImpedirOverscrollDocumentoExpedicaoApp({
        foraDaLista: false,
        noTopo: true,
        noFundo: true,
        ptr: true,
        deltaY: -20,
      })
    ).toBe(true)
  })

  it('deixa a lista rolar no miolo', () => {
    expect(
      deveImpedirOverscrollDocumentoExpedicaoApp({
        foraDaLista: false,
        noTopo: false,
        noFundo: false,
        ptr: false,
        deltaY: -16,
      })
    ).toBe(false)
    expect(
      deveImpedirOverscrollDocumentoExpedicaoApp({
        foraDaLista: false,
        noTopo: false,
        noFundo: false,
        ptr: false,
        deltaY: 16,
      })
    ).toBe(false)
  })
})

describe('deveImpedirGestoPinchExpedicaoApp', () => {
  it('trava dois ou mais dedos e deixa o toque simples', () => {
    expect(deveImpedirGestoPinchExpedicaoApp(1)).toBe(false)
    expect(deveImpedirGestoPinchExpedicaoApp(2)).toBe(true)
    expect(deveImpedirGestoPinchExpedicaoApp(3)).toBe(true)
  })
})

describe('deveCorrigirPanVisualViewportExpedicaoApp', () => {
  it('corrige janela deslocada, escala ≠ 1 e pan horizontal', () => {
    expect(
      deveCorrigirPanVisualViewportExpedicaoApp({
        scale: 1,
        offsetLeft: 0,
        windowScrollX: 0,
        windowScrollY: 12,
      })
    ).toBe(true)
    expect(
      deveCorrigirPanVisualViewportExpedicaoApp({
        scale: 1.15,
        offsetLeft: 0,
        windowScrollX: 0,
        windowScrollY: 0,
      })
    ).toBe(true)
    expect(
      deveCorrigirPanVisualViewportExpedicaoApp({
        scale: 1,
        offsetLeft: 24,
        windowScrollX: 0,
        windowScrollY: 0,
      })
    ).toBe(true)
  })

  it('não mexe no viewport estável (teclado usa offsetTop, não entra aqui)', () => {
    expect(
      deveCorrigirPanVisualViewportExpedicaoApp({
        scale: 1,
        offsetLeft: 0,
        windowScrollX: 0,
        windowScrollY: 0,
      })
    ).toBe(false)
  })
})

describe('medidasTecladoVisualViewportExpedicaoApp', () => {
  it('usa innerHeight com teclado fechado e ignora offsetTop residual', () => {
    expect(
      medidasTecladoVisualViewportExpedicaoApp({
        innerHeight: 800,
        vvHeight: 790,
        vvOffsetTop: 12,
      })
    ).toEqual({ heightPx: 800, offsetTopPx: 0, tecladoAberto: false })
  })

  it('encolhe o shell quando o teclado abre', () => {
    expect(
      medidasTecladoVisualViewportExpedicaoApp({
        innerHeight: 800,
        vvHeight: 420.6,
        vvOffsetTop: 48.2,
      })
    ).toEqual({ heightPx: 421, offsetTopPx: 48, tecladoAberto: true })
  })
})
