import { describe, expect, it } from 'vitest'

/**
 * Espelha a lógica de offsets de `usePrefetchRemainingCatalogPages`
 * (sem React) para garantir o cálculo paralelo.
 */
function offsetsRestantes(opts: {
  count: number
  pageSize: number
  nextOffset: number | null
}): number[] {
  if (opts.nextOffset == null) return []
  const offsets: number[] = []
  if (opts.count > opts.pageSize) {
    for (let offset = opts.pageSize; offset < opts.count; offset += opts.pageSize) {
      offsets.push(offset)
    }
  } else {
    offsets.push(opts.nextOffset)
  }
  return offsets
}

describe('offsetsRestantes (prefetch paralelo)', () => {
  it('gera offsets 100,200,300 para count 350', () => {
    expect(
      offsetsRestantes({ count: 350, pageSize: 100, nextOffset: 100 })
    ).toEqual([100, 200, 300])
  })

  it('não gera offsets quando não há próxima página', () => {
    expect(offsetsRestantes({ count: 40, pageSize: 100, nextOffset: null })).toEqual([])
  })

  it('usa nextOffset quando count é inconsistente', () => {
    expect(
      offsetsRestantes({ count: 50, pageSize: 100, nextOffset: 100 })
    ).toEqual([100])
  })
})
