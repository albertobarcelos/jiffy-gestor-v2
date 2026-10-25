import { describe, expect, it } from 'vitest'
import { ListarMeiosPagamentoPublicoUseCase } from '@/src/application/use-cases/delivery-publico/ListarMeiosPagamentoPublicoUseCase'
import { normalizarMeioPagamentoPublico } from '@/src/application/mappers/normalizarMeiosPagamentoPublicos'
import type { MeioPagamentoPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'

function meioBase(
  overrides: Partial<MeioPagamentoPublicoDTO> = {}
): MeioPagamentoPublicoDTO {
  return {
    id: 'pix',
    nome: 'PIX',
    ativoEntregaDelivery: false,
    ativoRetiradaDelivery: false,
    formaPagamentoFiscal: 'pix',
    formaPagamentoFiscalLabel: 'PIX',
    isParcelavel: false,
    tipoParcelamento: '',
    ...overrides,
  }
}

describe('normalizarMeiosPagamentoPublicos', () => {
  it('payload só com ativoDelivery liga os dois canais', () => {
    const meio = meioBase({
      ativoEntregaDelivery: undefined,
      ativoRetiradaDelivery: undefined,
      ativoDelivery: true,
    })
    expect(normalizarMeioPagamentoPublico(meio)).toMatchObject({
      ativoEntregaDelivery: true,
      ativoRetiradaDelivery: true,
    })
  })

  it('sem flag nenhuma os dois canais ficam desligados', () => {
    const meio = meioBase({
      ativoEntregaDelivery: undefined,
      ativoRetiradaDelivery: undefined,
    })
    expect(normalizarMeioPagamentoPublico(meio)).toMatchObject({
      ativoEntregaDelivery: false,
      ativoRetiradaDelivery: false,
    })
  })

  it('flag nova explícita não herda o legado', () => {
    expect(
      normalizarMeioPagamentoPublico(
        meioBase({
          ativoEntregaDelivery: true,
          ativoRetiradaDelivery: false,
          ativoDelivery: true,
        })
      )
    ).toMatchObject({
      ativoEntregaDelivery: true,
      ativoRetiradaDelivery: false,
    })
  })
})

describe('ListarMeiosPagamentoPublicoUseCase', () => {
  it('normaliza o payload da API antes de devolver', async () => {
    const useCase = new ListarMeiosPagamentoPublicoUseCase({
      listarPorSlug: async () => ({
        meiosPagamento: [
          meioBase({
            ativoEntregaDelivery: undefined,
            ativoRetiradaDelivery: undefined,
            isDelivery: true,
          }),
        ],
      }),
    })

    const resposta = await useCase.execute('loja')
    expect(resposta.meiosPagamento[0]).toMatchObject({
      ativoEntregaDelivery: true,
      ativoRetiradaDelivery: true,
    })
  })
})
