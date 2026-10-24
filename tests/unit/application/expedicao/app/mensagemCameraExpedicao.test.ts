import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cameraDisponivelNesteContexto,
  mensagemErroCameraExpedicao,
} from '@/src/application/expedicao/app/mensagemCameraExpedicao'

describe('mensagemCameraExpedicao', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('explica bloqueio em HTTP (iPhone na LAN)', () => {
    vi.stubGlobal('window', { isSecureContext: false })
    expect(mensagemErroCameraExpedicao(null)).toMatch(/HTTPS/)
  })

  it('explica permissão negada', () => {
    vi.stubGlobal('window', { isSecureContext: true })
    expect(mensagemErroCameraExpedicao({ name: 'NotAllowedError' })).toMatch(/Permissão/)
  })

  it('cameraDisponivel exige contexto seguro', () => {
    vi.stubGlobal('window', { isSecureContext: false })
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: () => undefined } })
    expect(cameraDisponivelNesteContexto()).toBe(false)
  })
})
