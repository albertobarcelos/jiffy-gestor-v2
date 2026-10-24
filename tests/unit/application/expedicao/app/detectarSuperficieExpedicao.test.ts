import { describe, expect, it } from 'vitest'
import {
  isRotaExpedicaoApp,
  isSinalExpedicaoAppSearch,
  isSuperficieExpedicaoApp,
} from '@/src/application/expedicao/app/detectarSuperficieExpedicao'

describe('detectarSuperficieExpedicao', () => {
  it('reconhece ?app', () => {
    expect(isSinalExpedicaoAppSearch('?expedicao&app')).toBe(true)
    expect(isSinalExpedicaoAppSearch('?expedicao')).toBe(false)
  })

  it('reconhece /expedicao/app e /e', () => {
    expect(isRotaExpedicaoApp('/expedicao/app')).toBe(true)
    expect(isRotaExpedicaoApp('/e')).toBe(true)
    expect(isRotaExpedicaoApp('/expedicao')).toBe(false)
  })

  it('superfície app por path, query ou host', () => {
    expect(isSuperficieExpedicaoApp({ pathname: '/expedicao/app', search: '' })).toBe(true)
    expect(isSuperficieExpedicaoApp({ pathname: '/login', search: '?expedicao&app' })).toBe(true)
    expect(isSuperficieExpedicaoApp({ pathname: '/', host: 'entregador.jiffy.run' })).toBe(true)
    expect(isSuperficieExpedicaoApp({ pathname: '/expedicao', search: '?expedicao' })).toBe(false)
  })
})
