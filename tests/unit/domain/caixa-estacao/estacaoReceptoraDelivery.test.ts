import { describe, expect, it } from 'vitest'
import {
  estacaoEhReceptoraDelivery,
  resolverEstacaoReceptoraDelivery,
} from '@/src/domain/caixa-estacao/estacaoReceptoraDelivery'

const estacoesDaLoja = [
  { id: 'balcao-principal', nome: 'Balcão principal', gestorDelivery: false },
  { id: 'expedicao-delivery', nome: 'Expedição delivery', gestorDelivery: true },
]

describe('Estação receptora do delivery', () => {
  describe('quando a loja tem estações cadastradas', () => {
    it('encontra qual estação recebe os pedidos delivery finalizados', () => {
      const receptora = resolverEstacaoReceptoraDelivery(estacoesDaLoja)

      expect(receptora?.id).toBe('expedicao-delivery')
      expect(receptora?.nome).toBe('Expedição delivery')
    })
  })

  describe('quando verificamos a estação deste computador', () => {
    it('confirma que a estação de expedição é a receptora do delivery', () => {
      expect(estacaoEhReceptoraDelivery('expedicao-delivery', estacoesDaLoja)).toBe(true)
    })

    it('deixa claro que o balcão não é a receptora do delivery', () => {
      expect(estacaoEhReceptoraDelivery('balcao-principal', estacoesDaLoja)).toBe(false)
    })

    it('trata computador sem estação vinculada como não receptora', () => {
      expect(estacaoEhReceptoraDelivery(null, estacoesDaLoja)).toBe(false)
    })
  })
})
