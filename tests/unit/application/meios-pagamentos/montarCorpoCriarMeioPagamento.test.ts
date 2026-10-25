import { describe, expect, it } from 'vitest'
import { CriarMeioPagamentoSchema } from '@/src/application/dto/CriarMeioPagamentoDTO'
import { montarCorpoCriarMeioPagamento } from '@/src/application/meios-pagamentos/montarCorpoCriarMeioPagamento'

describe('montarCorpoCriarMeioPagamento', () => {
  it('POST sem flag não liga retirada sozinho', () => {
    const data = CriarMeioPagamentoSchema.parse({ nome: 'PIX' })
    expect(montarCorpoCriarMeioPagamento(data)).toMatchObject({
      nome: 'PIX',
      ativoEntregaDelivery: false,
      ativoRetiradaDelivery: false,
    })
  })

  it('manda os dois canais quando o cadastro escolheu', () => {
    expect(
      montarCorpoCriarMeioPagamento({
        nome: 'DINHEIRO',
        ativoEntregaDelivery: true,
        ativoRetiradaDelivery: false,
      })
    ).toMatchObject({
      ativoEntregaDelivery: true,
      ativoRetiradaDelivery: false,
    })
  })
})
