import { describe, expect, it } from 'vitest'
import {
  deveTentarInversaoJsQr,
  mensagemFeedbackScanQr,
  recorteVisorScan,
} from '@/src/application/expedicao/app/recorteVisorScan'

describe('recorteVisorScan', () => {
  it('recorta o quadrado central de um frame paisagem', () => {
    expect(recorteVisorScan(1920, 1080, 360)).toEqual({
      sx: 420,
      sy: 0,
      sw: 1080,
      sh: 1080,
      dw: 360,
      dh: 360,
    })
  })

  it('recorta o quadrado central de um frame retrato', () => {
    expect(recorteVisorScan(1080, 1920, 360)).toEqual({
      sx: 0,
      sy: 420,
      sw: 1080,
      sh: 1080,
      dw: 360,
      dh: 360,
    })
  })

  it('ignora frame inválido', () => {
    expect(recorteVisorScan(0, 720)).toBeNull()
  })
})

describe('deveTentarInversaoJsQr', () => {
  it('inverte só a cada 4º frame', () => {
    expect([0, 1, 2, 3, 4].map(deveTentarInversaoJsQr)).toEqual([false, false, false, true, false])
  })
})

describe('mensagemFeedbackScanQr', () => {
  it('avisa na hora do código e no processar', () => {
    expect(mensagemFeedbackScanQr('lido', false)).toBe('Código lido')
    expect(mensagemFeedbackScanQr('procurando', true)).toBe('Adicionando pedido…')
    expect(mensagemFeedbackScanQr('lido', true)).toBe('Adicionando pedido…')
    expect(mensagemFeedbackScanQr('falhou', false)).toMatch(/Aponte/)
    expect(mensagemFeedbackScanQr('procurando', false)).toMatch(/quadro/)
  })
})
