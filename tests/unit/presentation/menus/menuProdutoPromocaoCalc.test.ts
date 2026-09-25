import { describe, expect, it } from 'vitest'
import {
  arredondarCentavos,
  descontoPercentualFromPrecos,
  isValorPromocionalValido,
  produtoTemPromocaoPreenchida,
  valorPromocionalFromDesconto,
} from '@/src/presentation/components/features/menus/menuProdutoPromocaoCalc'

describe('menuProdutoPromocaoCalc', () => {
  it('arredonda centavos', () => {
    expect(arredondarCentavos(19.999)).toBe(20)
    expect(arredondarCentavos(19.994)).toBe(19.99)
  })

  it('calcula % a partir do normal e do promocional', () => {
    expect(descontoPercentualFromPrecos(100, 80)).toBe(20)
    expect(descontoPercentualFromPrecos(39.9, 29.9)).toBe(25.06)
  })

  it('calcula promocional a partir do %', () => {
    expect(valorPromocionalFromDesconto(100, 20)).toBe(80)
    expect(valorPromocionalFromDesconto(40, 50)).toBe(20)
  })

  it('retorna null quando o preço normal é inválido', () => {
    expect(descontoPercentualFromPrecos(0, 10)).toBeNull()
    expect(valorPromocionalFromDesconto(-1, 10)).toBeNull()
  })

  it('trata promocional 0 como sem promo (desconto 0)', () => {
    expect(descontoPercentualFromPrecos(50, 0)).toBe(0)
    expect(descontoPercentualFromPrecos(39.9, 0)).toBe(0)
  })

  it('limita o desconto entre 0 e 100%', () => {
    expect(valorPromocionalFromDesconto(50, 150)).toBe(0)
    expect(valorPromocionalFromDesconto(50, -10)).toBe(50)
  })

  it('considera promoção preenchida só quando valor > 1', () => {
    expect(produtoTemPromocaoPreenchida(0)).toBe(false)
    expect(produtoTemPromocaoPreenchida(1)).toBe(false)
    expect(produtoTemPromocaoPreenchida(1.01)).toBe(true)
    expect(produtoTemPromocaoPreenchida(29.9)).toBe(true)
    expect(produtoTemPromocaoPreenchida(undefined)).toBe(false)
  })

  it('valida preço promocional maior que 1 para salvar', () => {
    expect(isValorPromocionalValido(0)).toBe(false)
    expect(isValorPromocionalValido(1)).toBe(false)
    expect(isValorPromocionalValido(1.01)).toBe(true)
    expect(isValorPromocionalValido(NaN)).toBe(false)
  })
})
