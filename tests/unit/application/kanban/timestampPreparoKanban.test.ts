import { describe, expect, it } from 'vitest'
import {
  escolherTimestampPreparo,
  isoTimestampPreparoValido,
} from '@/src/application/kanban/timestampPreparoKanban'

describe('escolherTimestampPreparo', () => {
  it('só substitui quando a API manda ISO válida', () => {
    expect(escolherTimestampPreparo('2026-06-15T10:00:00.000Z', '2026-06-15T09:00:00.000Z')).toBe(
      '2026-06-15T10:00:00.000Z'
    )
  })

  it('null ou vazio da API não apaga o cache', () => {
    expect(escolherTimestampPreparo(null, '2026-06-15T10:00:00.000Z')).toBe(
      '2026-06-15T10:00:00.000Z'
    )
    expect(escolherTimestampPreparo('', '2026-06-15T10:00:00.000Z')).toBe(
      '2026-06-15T10:00:00.000Z'
    )
    expect(escolherTimestampPreparo(undefined, '2026-06-15T10:00:00.000Z')).toBe(
      '2026-06-15T10:00:00.000Z'
    )
  })

  it('rejeita texto que não é instante', () => {
    expect(isoTimestampPreparoValido('ontem')).toBe(false)
    expect(escolherTimestampPreparo('ontem', '2026-06-15T10:00:00.000Z')).toBe(
      '2026-06-15T10:00:00.000Z'
    )
  })
})
