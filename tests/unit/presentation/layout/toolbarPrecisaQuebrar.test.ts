import { describe, expect, it } from 'vitest'
import { toolbarPrecisaQuebrar } from '@/src/presentation/layout/toolbarPrecisaQuebrar'

describe('toolbarPrecisaQuebrar', () => {
  it('quebra quando não há largura disponível', () => {
    expect(
      toolbarPrecisaQuebrar({
        disponivel: 0,
        larguraFiltros: 200,
        larguraAcoesCima: 80,
        larguraAcoesBaixo: 80,
        jaQuebrou: false,
        scrollWidth: 0,
        clientWidth: 0,
      })
    ).toBe(true)
  })

  it('quebra na linha única só quando o estouro é claro', () => {
    expect(
      toolbarPrecisaQuebrar({
        disponivel: 800,
        larguraFiltros: 100,
        larguraAcoesCima: 80,
        larguraAcoesBaixo: 80,
        jaQuebrou: false,
        scrollWidth: 900,
        clientWidth: 800,
      })
    ).toBe(true)
  })

  it('não quebra na linha única por uns poucos pixels', () => {
    expect(
      toolbarPrecisaQuebrar({
        disponivel: 1447,
        larguraFiltros: 907,
        larguraAcoesCima: 189,
        larguraAcoesBaixo: 342,
        jaQuebrou: false,
        scrollWidth: 1454,
        clientWidth: 1447,
        gap: 6,
      })
    ).toBe(false)
  })

  it('desfaz a quebra quando a soma só passa por poucos pixels', () => {
    expect(
      toolbarPrecisaQuebrar({
        disponivel: 1447,
        larguraFiltros: 907,
        larguraAcoesCima: 189,
        larguraAcoesBaixo: 342,
        jaQuebrou: true,
        scrollWidth: 1447,
        clientWidth: 1447,
        gap: 6,
      })
    ).toBe(false)
  })

  it('mantém a quebra quando a linha única claramente não cabe', () => {
    expect(
      toolbarPrecisaQuebrar({
        disponivel: 1100,
        larguraFiltros: 907,
        larguraAcoesCima: 189,
        larguraAcoesBaixo: 342,
        jaQuebrou: true,
        scrollWidth: 1100,
        clientWidth: 1100,
        gap: 6,
      })
    ).toBe(true)
  })
})
