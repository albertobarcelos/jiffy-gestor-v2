import { describe, expect, it } from 'vitest'
import {
  deveMostrarPortaoInstalacaoPwa,
  ehCelularPwaEntregador,
  isDisplayStandalonePwa,
} from '@/src/application/expedicao/app/portaoInstalacaoPwaEntregador'

describe('portaoInstalacaoPwaEntregador', () => {
  it('reconhece app aberto pelo ícone', () => {
    expect(isDisplayStandalonePwa({ displayModeStandalone: true })).toBe(true)
    expect(isDisplayStandalonePwa({ iosStandalone: true })).toBe(true)
    expect(isDisplayStandalonePwa({})).toBe(false)
  })

  it('só trava o fluxo no celular fora do PWA', () => {
    expect(deveMostrarPortaoInstalacaoPwa({ ehCelular: true, standalone: false })).toBe(true)
    expect(deveMostrarPortaoInstalacaoPwa({ ehCelular: true, standalone: true })).toBe(false)
    expect(deveMostrarPortaoInstalacaoPwa({ ehCelular: false, standalone: false })).toBe(false)
  })

  it('detecta user agent de celular', () => {
    expect(ehCelularPwaEntregador('Mozilla/5.0 (Linux; Android 14)')).toBe(true)
    expect(ehCelularPwaEntregador('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)')).toBe(true)
    expect(ehCelularPwaEntregador('Mozilla/5.0 (Windows NT 10.0)')).toBe(false)
  })
})
