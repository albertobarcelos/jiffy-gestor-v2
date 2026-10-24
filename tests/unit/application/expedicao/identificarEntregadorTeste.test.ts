import { describe, expect, it } from 'vitest'
import { escolherEntregadorParaSenhaTeste } from '@/src/application/expedicao/identificarEntregadorTeste'

describe('escolherEntregadorParaSenhaTeste', () => {
  it('com 1234 devolve o entregador chamado ENTREGADOR', () => {
    expect(
      escolherEntregadorParaSenhaTeste(
        [
          { id: 'a', nome: 'Outro', ativo: true },
          { id: 'cmu30xddj01bppo010cvz4hw4', nome: 'ENTREGADOR', telefone: '65996321001' },
        ],
        '1234'
      )
    ).toEqual({
      id: 'cmu30xddj01bppo010cvz4hw4',
      nome: 'ENTREGADOR',
      telefone: '65996321001',
      ativo: true,
    })
  })

  it('recusa outra senha', () => {
    expect(escolherEntregadorParaSenhaTeste([{ id: 'a', nome: 'ENTREGADOR' }], '0000')).toBeNull()
  })
})
