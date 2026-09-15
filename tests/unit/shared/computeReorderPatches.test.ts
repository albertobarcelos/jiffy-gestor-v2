import { describe, expect, it, vi } from 'vitest'
import {
  applySequentialReorder,
  computeReorderPatches,
  hasReorderChanged,
} from '@/src/shared/utils/computeReorderPatches'

describe('computeReorderPatches', () => {
  it('detecta mudança de ordem', () => {
    expect(hasReorderChanged(['a', 'b'], ['a', 'b'])).toBe(false)
    expect(hasReorderChanged(['a', 'b'], ['b', 'a'])).toBe(true)
  })

  it('gera patches com posição 1-based', () => {
    const patches = computeReorderPatches(['a', 'b', 'c'], ['c', 'b', 'a'])
    expect(patches).toEqual([
      { id: 'c', novaPosicao: 1 },
      { id: 'a', novaPosicao: 3 },
    ])
  })
})

describe('applySequentialReorder', () => {
  it('aplica reordenações em série até a ordem final', async () => {
    const calls: Array<{ id: string; pos: number }> = []
    await applySequentialReorder(
      ['a', 'b', 'c', 'd'],
      ['d', 'b', 'c', 'a'],
      async (id, novaPosicao) => {
        calls.push({ id, pos: novaPosicao })
      }
    )
    expect(calls.some(c => c.id === 'd' && c.pos === 1)).toBe(true)
    expect(calls.length).toBeGreaterThan(0)
  })

  it('não chama reorder quando ordem já está correta', async () => {
    const reorder = vi.fn()
    await applySequentialReorder(['a', 'b'], ['a', 'b'], reorder)
    expect(reorder).not.toHaveBeenCalled()
  })
})
