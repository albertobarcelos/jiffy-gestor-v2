import { describe, expect, it } from 'vitest'
import {
  formatarQuantidadeProdutoExibicao,
  incrementarQuantidadeProduto,
  normalizarQuantidadeProduto,
  parseQuantidadeProdutoInput,
  quantidadeProdutoPodeDiminuir,
} from '@/src/shared/utils/quantidadeProdutoInput'

describe('quantidadeProdutoInput', () => {
  it('formata UN inteiro sem fração', () => {
    expect(formatarQuantidadeProdutoExibicao(2, 'UN')).toBe('2')
    expect(formatarQuantidadeProdutoExibicao(3, 'UN')).toBe('3')
  })

  it('exibe fração quando quantidade persistida é decimal (unidade ausente ou UN)', () => {
    expect(formatarQuantidadeProdutoExibicao(2.4, 'UN')).toBe('2,4')
    expect(formatarQuantidadeProdutoExibicao(2.4)).toBe('2,4')
    expect(formatarQuantidadeProdutoExibicao(1.3, 'UN')).toBe('1,3')
  })

  it('formata KG com vírgula decimal', () => {
    expect(formatarQuantidadeProdutoExibicao(2.5, 'KG')).toBe('2,5')
    expect(formatarQuantidadeProdutoExibicao(1.3, 'KG')).toBe('1,3')
  })

  it('parseia quantidade KG em formato BR', () => {
    expect(parseQuantidadeProdutoInput('2,5', 'KG')).toBe(2.5)
    expect(parseQuantidadeProdutoInput('1,3', 'KG')).toBe(1.3)
  })

  it('normaliza UN para inteiro mínimo 1', () => {
    expect(normalizarQuantidadeProduto(2.9, 'UN')).toBe(2)
    expect(normalizarQuantidadeProduto(0.2, 'UN')).toBe(1)
  })

  it('incrementa KG em passos de 0,1', () => {
    expect(incrementarQuantidadeProduto(1.3, 1, 'KG')).toBe(1.4)
    expect(incrementarQuantidadeProduto(2.5, -1, 'KG')).toBe(2.4)
  })

  it('permite diminuir KG acima do mínimo', () => {
    expect(quantidadeProdutoPodeDiminuir(0.5, 'KG')).toBe(true)
    expect(quantidadeProdutoPodeDiminuir(0.001, 'KG')).toBe(false)
  })
})
