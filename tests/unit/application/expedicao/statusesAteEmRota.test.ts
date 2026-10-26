import { describe, expect, it } from 'vitest'
import { statusesAteEmRota, statusesAtePronto } from '@/src/application/expedicao/statusesAteEmRota'

describe('transições da bancada', () => {
  it('leitura encadeia até pronto', () => {
    expect(statusesAtePronto('PENDENTE')).toEqual(['EM_PREPARO', 'PRONTO'])
    expect(statusesAtePronto('EM_PREPARO')).toEqual(['PRONTO'])
    expect(statusesAtePronto('PRONTO')).toEqual([])
  })

  it('expedir só manda para em rota', () => {
    expect(statusesAteEmRota('PRONTO')).toEqual(['EM_ROTA'])
    expect(statusesAteEmRota('EM_PREPARO')).toEqual([])
    expect(statusesAteEmRota('EM_ROTA')).toEqual([])
  })
})
