import { describe, expect, it } from 'vitest'
import { renderQrSvg } from '@/src/infrastructure/printing/qrSvg'

describe('renderQrSvg', () => {
  it('gera SVG local sem rede', () => {
    const svg = renderQrSvg('https://wa.me/5511999999999', 74)
    expect(svg.includes('<svg') || svg.includes('<img')).toBe(true)
    expect(svg).not.toContain('qrserver')
  })
})
