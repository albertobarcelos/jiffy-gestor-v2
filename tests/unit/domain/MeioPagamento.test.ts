import { describe, expect, it } from 'vitest'
import { MeioPagamento } from '@/src/domain/entities/MeioPagamento'
import { AtualizarMeioPagamentoSchema } from '@/src/application/dto/AtualizarMeioPagamentoDTO'
import { CriarMeioPagamentoSchema } from '@/src/application/dto/CriarMeioPagamentoDTO'

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

  it('toJSON inclui ativoDelivery', () => {
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
    expect(meio.toJSON()).toMatchObject({
      ativoEntregaDelivery: true,
      ativoRetiradaDelivery: false,
    })
  })

  it('usa a flag legada como fallback da entrega, sem substituir retirada explícita', () => {
    const meio = MeioPagamento.fromJSON({
      ...base,
      ativoDelivery: true,
      ativoRetiradaDelivery: false,
    })

    expect(meio.isEntregaDelivery()).toBe(true)
    expect(meio.isRetiradaDelivery()).toBe(false)
  })
})

describe('DTOs locais de meios de pagamento', () => {
  it('normaliza ativoDelivery legado para ativoEntregaDelivery na criação', () => {
    expect(
      CriarMeioPagamentoSchema.parse({ nome: 'PIX', ativoDelivery: true })
    ).toMatchObject({
      ativoEntregaDelivery: true,
      ativoRetiradaDelivery: true,
    })
  })

  it('prioriza ativoEntregaDelivery quando a entrada também contém ativoDelivery', () => {
    expect(
      CriarMeioPagamentoSchema.parse({
        nome: 'PIX',
        ativoDelivery: true,
        ativoEntregaDelivery: false,
        ativoRetiradaDelivery: false,
      })
    ).toMatchObject({
      ativoEntregaDelivery: false,
      ativoRetiradaDelivery: false,
    })
  })

  it('preserva campos novos independentes em atualização parcial', () => {
    expect(
      AtualizarMeioPagamentoSchema.parse({
        ativoEntregaDelivery: false,
        ativoRetiradaDelivery: true,
      })
    ).toEqual({
      ativoEntregaDelivery: false,
      ativoRetiradaDelivery: true,
    })
  })

  it('normaliza ativoDelivery legado em atualização parcial', () => {
    expect(
      AtualizarMeioPagamentoSchema.parse({ ativoDelivery: false })
    ).toEqual({ ativoEntregaDelivery: false })
  })
})
