import { describe, expect, it } from 'vitest'
import { renderDashSeparatorHtml, renderQrSvg } from '@/src/infrastructure/printing/receiptBitmaps'

describe('receiptBitmaps', () => {
  it('gera QR local', () => {
    const markup = renderQrSvg('https://wa.me/5511999999999', 96)
    expect(markup.includes('<svg') || markup.includes('<img')).toBe(true)
    expect(markup).not.toContain('qrserver')
  })

  it('gera traço pontilhado', () => {
    const markup = renderDashSeparatorHtml(280, false)
    expect(markup.includes('separator')).toBe(true)
    expect(markup.includes('<img') || markup.includes('-')).toBe(true)
  })
})
