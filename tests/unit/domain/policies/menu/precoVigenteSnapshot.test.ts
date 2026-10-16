import { describe, expect, it } from 'vitest'
import {
  arredondarCentavos,
  arredondarPercentualUmaCasa,
  descontoPercentualFromPrecos,
  findDescontoPercentualExato,
  isValorPromocionalValido,
  produtoTemPromocaoPreenchida,
  promocaoSnapshotVigente,
  resolverPrecosSnapshotMenu,
  valorPromocionalFromDesconto,
} from '@/src/domain/policies/menu/precoVigenteSnapshot'

describe('precoVigenteSnapshot', () => {
  it('arredonda centavos', () => {
    expect(arredondarCentavos(19.999)).toBe(20)
    expect(arredondarCentavos(19.994)).toBe(19.99)
  })

  it('arredonda percentual em 1 casa', () => {
    expect(arredondarPercentualUmaCasa(15.04)).toBe(15)
    expect(arredondarPercentualUmaCasa(15.05)).toBe(15.1)
    expect(arredondarPercentualUmaCasa(25.06)).toBe(25.1)
  })

  it('calcula promocional a partir do % (1 casa) e centavos', () => {
    expect(valorPromocionalFromDesconto(100, 20)).toBe(80)
    expect(valorPromocionalFromDesconto(40, 50)).toBe(20)
    expect(valorPromocionalFromDesconto(39.9, 15)).toBe(33.92)
    expect(valorPromocionalFromDesconto(100, 15.5)).toBe(84.5)
  })

  it('ida e volta estável quando o promo veio do %', () => {
    const normal = 39.9
    const promo = valorPromocionalFromDesconto(normal, 15)
    expect(promo).toBe(33.92)
    expect(descontoPercentualFromPrecos(normal, promo!)).toBe(15)
    expect(findDescontoPercentualExato(normal, promo!)).toBe(15)
  })

  it('calcula % a partir do normal e do promocional', () => {
    expect(descontoPercentualFromPrecos(100, 80)).toBe(20)
    // Promo digitado sem match exato de 0,1% → fallback a 1 casa
    expect(descontoPercentualFromPrecos(39.9, 29.9)).toBe(25.1)
  })

  it('retorna null quando o preço normal é inválido', () => {
    expect(descontoPercentualFromPrecos(0, 10)).toBeNull()
    expect(valorPromocionalFromDesconto(-1, 10)).toBeNull()
  })

  it('trata promocional 0 como sem promo (desconto 0)', () => {
    expect(descontoPercentualFromPrecos(50, 0)).toBe(0)
  })

  it('limita o desconto entre 0 e 100%', () => {
    expect(valorPromocionalFromDesconto(50, 150)).toBe(0)
    expect(valorPromocionalFromDesconto(50, -10)).toBe(50)
  })

  it('considera promoção preenchida só quando valor > 1', () => {
    expect(produtoTemPromocaoPreenchida(0)).toBe(false)
    expect(produtoTemPromocaoPreenchida(1)).toBe(false)
    expect(produtoTemPromocaoPreenchida(1.01)).toBe(true)
    expect(produtoTemPromocaoPreenchida(undefined)).toBe(false)
  })

  it('valida preço promocional maior que 1 e menor que o normal', () => {
    expect(isValorPromocionalValido(1.01, 20)).toBe(true)
    expect(isValorPromocionalValido(20, 20)).toBe(false)
    expect(isValorPromocionalValido(25, 20)).toBe(false)
    expect(isValorPromocionalValido(1, 20)).toBe(false)
  })

  it('vigente só com flag ligada e promo menor que o normal', () => {
    expect(
      promocaoSnapshotVigente({ valor: 39.9, valorPromocional: 27.93, promocaoAtiva: true })
    ).toBe(true)
    expect(
      promocaoSnapshotVigente({ valor: 39.9, valorPromocional: 27.93, promocaoAtiva: false })
    ).toBe(false)
    expect(
      promocaoSnapshotVigente({ valor: 20, valorPromocional: 25, promocaoAtiva: true })
    ).toBe(false)
  })

  it('resolve preço vigente do snapshot', () => {
    expect(
      resolverPrecosSnapshotMenu({
        valor: 39.9,
        valorPromocional: 27.93,
        promocaoAtiva: true,
      })
    ).toEqual({
      preco: 27.93,
      precoRegular: 39.9,
      descontoPercentual: 30,
    })
    expect(
      resolverPrecosSnapshotMenu({
        valor: 39.9,
        valorPromocional: 27.93,
        promocaoAtiva: false,
      })
    ).toEqual({
      preco: 39.9,
      precoRegular: null,
      descontoPercentual: null,
    })
  })
})
