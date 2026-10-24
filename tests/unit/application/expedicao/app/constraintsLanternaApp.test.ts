import { describe, expect, it } from 'vitest'
import { constraintsLanternaApp } from '@/src/application/expedicao/app/constraintsLanternaApp'

describe('constraintsLanternaApp', () => {
  it('pede a lanterna no advanced', () => {
    expect(constraintsLanternaApp(true).advanced).toEqual([{ torch: true }])
    expect(constraintsLanternaApp(false).advanced).toEqual([{ torch: false }])
  })
})
