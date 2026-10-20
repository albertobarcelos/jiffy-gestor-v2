import { describe, expect, it } from 'vitest'
import { categoriaAtivaNoSnapshot } from '@/src/domain/policies/menu/categoriaStatusNoMenu'

describe('categoriaAtivaNoSnapshot', () => {
  it('usa o ativo do snapshot deste menu', () => {
    expect(categoriaAtivaNoSnapshot({ ativo: true })).toBe(true)
    expect(categoriaAtivaNoSnapshot({ ativo: false })).toBe(false)
    expect(categoriaAtivaNoSnapshot({})).toBe(true)
  })
})
