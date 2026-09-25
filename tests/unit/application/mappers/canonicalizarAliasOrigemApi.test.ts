import { describe, expect, it } from 'vitest'
import { canonicalizarAliasOrigemApi } from '@/src/application/mappers/canonicalizarAliasOrigemApi'

describe('canonicalizarAliasOrigemApi', () => {
  it('converte o alias do PDV para IFOOD', () => {
    expect(canonicalizarAliasOrigemApi('DELIVERY_IFOOD')).toBe('IFOOD')
    expect(canonicalizarAliasOrigemApi('delivery_ifood')).toBe('IFOOD')
  })

  it('preserva valores já canônicos', () => {
    expect(canonicalizarAliasOrigemApi('IFOOD')).toBe('IFOOD')
    expect(canonicalizarAliasOrigemApi('AIQFOME')).toBe('AIQFOME')
    expect(canonicalizarAliasOrigemApi('JIFFY_DELIVERY')).toBe('JIFFY_DELIVERY')
  })
})
