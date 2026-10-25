import { describe, expect, it } from 'vitest'
import { MeioPagamento } from '@/src/domain/entities/MeioPagamento'

const base = {
  id: 'mp-1',
  nome: 'PIX',
  tefAtivo: true,
  formaPagamentoFiscal: 'pix',
  ativo: true,
}

describe('MeioPagamento.fromJSON ativoDelivery', () => {
  it('ausente → false', () => {
    expect(MeioPagamento.fromJSON(base).isDelivery()).toBe(false)
  })

  it('true → disponível no delivery', () => {
    expect(MeioPagamento.fromJSON({ ...base, ativoDelivery: true }).isDelivery()).toBe(true)
  })

  it('string "true" → disponível no delivery', () => {
    expect(MeioPagamento.fromJSON({ ...base, ativoDelivery: 'true' }).isDelivery()).toBe(true)
  })

  it('false permanece false', () => {
    expect(MeioPagamento.fromJSON({ ...base, ativoDelivery: false }).isDelivery()).toBe(false)
  })

  it('aceita legado isDelivery na leitura', () => {
    expect(MeioPagamento.fromJSON({ ...base, isDelivery: true }).isDelivery()).toBe(true)
  })

  it('toJSON inclui ativoDelivery legado só da entrega', () => {
    expect(MeioPagamento.fromJSON({ ...base, ativoDelivery: true }).toJSON().ativoDelivery).toBe(
      true
    )
  })

  it('mantém entrega e retirada como flags independentes', () => {
    const meio = MeioPagamento.fromJSON({
      ...base,
      ativoEntregaDelivery: true,
      ativoRetiradaDelivery: false,
    })

    expect(meio.isEntregaDelivery()).toBe(true)
    expect(meio.isRetiradaDelivery()).toBe(false)
    expect(meio.disponivelParaTipoEntrega('entrega')).toBe(true)
    expect(meio.disponivelParaTipoEntrega('retirada')).toBe(false)
    expect(meio.toJSON()).toMatchObject({
      ativoEntregaDelivery: true,
      ativoRetiradaDelivery: false,
    })
  })

  it('usa a flag legada nas duas modalidades, sem substituir retirada explícita', () => {
    const meio = MeioPagamento.fromJSON({
      ...base,
      ativoDelivery: true,
      ativoRetiradaDelivery: false,
    })

    expect(meio.isEntregaDelivery()).toBe(true)
    expect(meio.isRetiradaDelivery()).toBe(false)
  })

  it('não copia entrega para retirada quando só a flag nova veio', () => {
    const meio = MeioPagamento.fromJSON({
      ...base,
      ativoEntregaDelivery: true,
    })

    expect(meio.isEntregaDelivery()).toBe(true)
    expect(meio.isRetiradaDelivery()).toBe(false)
  })

  it('isDelivery é verdadeiro se qualquer canal delivery estiver ligado', () => {
    const soRetirada = MeioPagamento.fromJSON({
      ...base,
      ativoEntregaDelivery: false,
      ativoRetiradaDelivery: true,
    })

    expect(soRetirada.isDelivery()).toBe(true)
    expect(soRetirada.disponivelParaTipoEntrega('retirada')).toBe(true)
    expect(soRetirada.disponivelParaTipoEntrega('entrega')).toBe(false)
  })
})
