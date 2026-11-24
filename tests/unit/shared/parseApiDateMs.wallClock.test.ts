import { describe, expect, it } from 'vitest'
import { formatElapsedTime, parseApiDateMs } from '@/src/shared/utils/formatters'

describe('parseApiDateMs asLocalWallClock', () => {
  it('ignora Z e trata o relógio como local', () => {
    const withZ = parseApiDateMs('2026-11-23T16:19:00.000Z', {
      asLocalWallClock: true,
    })
    const asLocal = parseApiDateMs('2026-11-23T16:19:00.000')
    expect(withZ).toBe(asLocal)
  })

  it('sem a opção, Z continua como UTC absoluto', () => {
    expect(parseApiDateMs('2026-11-23T16:19:00.000Z')).toBe(
      Date.parse('2026-11-23T16:19:00.000Z')
    )
  })

  it('formatElapsedTime com wall clock não conta ~3h a mais no fuso BR', () => {
    const agoraLocal = new Date()
    const y = agoraLocal.getFullYear()
    const m = String(agoraLocal.getMonth() + 1).padStart(2, '0')
    const d = String(agoraLocal.getDate()).padStart(2, '0')
    const h = String(agoraLocal.getHours()).padStart(2, '0')
    const min = String(agoraLocal.getMinutes()).padStart(2, '0')
    const fakeUtcLabel = `${y}-${m}-${d}T${h}:${min}:00.000Z`

    expect(formatElapsedTime(fakeUtcLabel, { asLocalWallClock: true })).toBe('agora')
  })
})
