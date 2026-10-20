import { describe, expect, it } from 'vitest'
import {
  fontPxParaCaberNaPilula,
  MARGEM_LATERAL_MOLDURA_PX,
} from '@/src/infrastructure/printing/pilulaProducaoPng'

describe('fontPxParaCaberNaPilula', () => {
  it('mantém a fonte quando o texto já cabe', () => {
    expect(fontPxParaCaberNaPilula(() => 200, 400, 30)).toBe(30)
  })

  it('reduz até RETIRADA + número + código caber', () => {
    const fontPx = fontPxParaCaberNaPilula(tamanho => tamanho * 12, 280, 30, 16)
    expect(fontPx).toBe(23)
    expect(fontPx * 12).toBeLessThanOrEqual(280)
  })

  it('abre o pontilhado nas laterais para ficar fora das letras', () => {
    expect(MARGEM_LATERAL_MOLDURA_PX).toBeLessThan(12)
  })
})
