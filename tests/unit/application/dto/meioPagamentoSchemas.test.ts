import { describe, expect, it } from 'vitest'
import { AtualizarMeioPagamentoSchema } from '@/src/application/dto/AtualizarMeioPagamentoDTO'
import { CriarMeioPagamentoSchema } from '@/src/application/dto/CriarMeioPagamentoDTO'

describe('DTOs locais de meios de pagamento', () => {
  it('normaliza ativoDelivery legado para ativoEntregaDelivery na criação', () => {
    expect(CriarMeioPagamentoSchema.parse({ nome: 'PIX', ativoDelivery: true })).toMatchObject({
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

  it('usa a flag legada para retirada na criação quando a nova flag não foi enviada', () => {
    expect(CriarMeioPagamentoSchema.parse({ nome: 'PIX', ativoDelivery: false })).toMatchObject({
      ativoEntregaDelivery: false,
      ativoRetiradaDelivery: false,
    })
  })

  it('preserva retirada explícita na criação mesmo com a flag legada', () => {
    expect(
      CriarMeioPagamentoSchema.parse({
        nome: 'PIX',
        ativoDelivery: false,
        ativoRetiradaDelivery: true,
      })
    ).toMatchObject({
      ativoEntregaDelivery: false,
      ativoRetiradaDelivery: true,
    })
  })

  it('mantém o default de retirada para entradas sem campos de Delivery', () => {
    expect(CriarMeioPagamentoSchema.parse({ nome: 'PIX' })).toMatchObject({
      ativoEntregaDelivery: false,
      ativoRetiradaDelivery: true,
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

  it('não inclui retirada em atualização parcial só de entrega', () => {
    expect(AtualizarMeioPagamentoSchema.parse({ ativoEntregaDelivery: false })).toEqual({
      ativoEntregaDelivery: false,
    })
  })

  it('normaliza ativoDelivery legado nas duas modalidades em atualização parcial', () => {
    expect(AtualizarMeioPagamentoSchema.parse({ ativoDelivery: false })).toEqual({
      ativoEntregaDelivery: false,
      ativoRetiradaDelivery: false,
    })
  })

  it('preserva flags explícitas em atualização junto com o campo legado', () => {
    expect(
      AtualizarMeioPagamentoSchema.parse({
        ativoDelivery: false,
        ativoEntregaDelivery: true,
      })
    ).toEqual({
      ativoEntregaDelivery: true,
      ativoRetiradaDelivery: false,
    })
  })
})
