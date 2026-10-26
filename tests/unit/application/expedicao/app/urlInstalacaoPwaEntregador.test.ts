import { describe, expect, it } from 'vitest'
import { URL_PUBLICA_APP_ENTREGADOR } from '@/src/application/expedicao/app/constantesSuperficie'
import { urlInstalacaoPwaEntregador } from '@/src/application/expedicao/app/urlInstalacaoPwaEntregador'

describe('urlInstalacaoPwaEntregador', () => {
  it('em localhost continua no Gestor local + /e', () => {
    expect(urlInstalacaoPwaEntregador('http://localhost:5552/')).toBe('http://localhost:5552/e')
    expect(urlInstalacaoPwaEntregador('http://127.0.0.1:5552')).toBe('http://127.0.0.1:5552/e')
  })

  it('fora do localhost usa o domínio público do JiffyGO', () => {
    expect(urlInstalacaoPwaEntregador('https://gestor.jiffy.run')).toBe(URL_PUBLICA_APP_ENTREGADOR)
    expect(urlInstalacaoPwaEntregador('https://app.jiffy.run')).toBe(URL_PUBLICA_APP_ENTREGADOR)
    expect(
      urlInstalacaoPwaEntregador(
        'https://jiffy-gestor-git-feat-expedicao-60a9c7-albertobarcelos-projects.vercel.app'
      )
    ).toBe(URL_PUBLICA_APP_ENTREGADOR)
  })

  it('sem origin devolve o domínio público', () => {
    expect(urlInstalacaoPwaEntregador('')).toBe(URL_PUBLICA_APP_ENTREGADOR)
  })
})
