import { describe, expect, it } from 'vitest'
import { formatElapsedTime, parseApiDateMs } from '@/src/shared/utils/formatters'

describe('parseApiDateMs', () => {
  it('sem Z interpreta como horário local', () => {
    expect(parseApiDateMs('2026-11-23T16:19:53.809')).toBe(
      new Date('2026-11-23T16:19:53.809').getTime()
    )
  })

  it('com Z interpreta como UTC absoluto', () => {
    expect(parseApiDateMs('2026-11-23T16:19:00.000Z')).toBe(
      Date.parse('2026-11-23T16:19:00.000Z')
    )
  })

  it('asLocalWallClock ignora Z (paliativo legado)', () => {
    const withZ = parseApiDateMs('2026-11-23T16:19:00.000Z', {
      asLocalWallClock: true,
    })
    const asLocal = parseApiDateMs('2026-11-23T16:19:00.000')
    expect(withZ).toBe(asLocal)
  })

  it('formatElapsedTime com data local sem Z não conta ~3h a mais', () => {
    const agoraLocal = new Date()
    const y = agoraLocal.getFullYear()
    const m = String(agoraLocal.getMonth() + 1).padStart(2, '0')
    const d = String(agoraLocal.getDate()).padStart(2, '0')
    const h = String(agoraLocal.getHours()).padStart(2, '0')
    const min = String(agoraLocal.getMinutes()).padStart(2, '0')
    const localNaive = `${y}-${m}-${d}T${h}:${min}:00.000`

    expect(formatElapsedTime(localNaive)).toBe('agora')
  })
})
