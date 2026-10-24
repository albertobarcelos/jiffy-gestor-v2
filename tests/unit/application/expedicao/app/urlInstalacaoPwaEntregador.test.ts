import { describe, expect, it } from 'vitest'
import { urlInstalacaoPwaEntregador } from '@/src/application/expedicao/app/urlInstalacaoPwaEntregador'

describe('urlInstalacaoPwaEntregador', () => {
  it('junta o origin com /e', () => {
    expect(urlInstalacaoPwaEntregador('https://gestor.jiffy.run')).toBe('https://gestor.jiffy.run/e')
    expect(urlInstalacaoPwaEntregador('http://localhost:5552/')).toBe('http://localhost:5552/e')
  })

  it('sem origin devolve só o caminho curto', () => {
    expect(urlInstalacaoPwaEntregador('')).toBe('/e')
  })
})
