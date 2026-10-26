import { describe, expect, it } from 'vitest'
import { modulosCode128B } from '@/src/application/expedicao/codigoBarras128'
import { renderCode128Svg } from '@/src/application/expedicao/renderCode128Svg'

describe('modulosCode128B', () => {
  it('gera módulos para o código da via', () => {
    const modulos = modulosCode128B('PTBIMLFJA')
    expect(modulos.length).toBeGreaterThan(20)
    expect(modulos.every(bit => bit === 0 || bit === 1)).toBe(true)
    expect(modulos[0]).toBe(1)
  })

  it('recusa caractere fora do Code 128B', () => {
    expect(modulosCode128B('ação')).toEqual([])
    expect(modulosCode128B('')).toEqual([])
  })

  it('monta SVG do Code 128 para o preview', () => {
    const svg = renderCode128Svg('P1842', 260, 56)
    expect(svg).toContain('<svg')
    expect(svg).toContain('width="260"')
    expect(svg).toContain('height="56"')
    expect(svg).toContain('rect')
  })
})
