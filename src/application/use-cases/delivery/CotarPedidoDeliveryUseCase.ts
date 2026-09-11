import { ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'
import type {
  CotacaoPedidoDeliveryBffRequest,
  ResultadoCotacaoTaxaMorada,
} from '@/src/application/dto/api/cotacaoPedidoDeliveryApi'
import {
  montarCotacaoPedidoDeliveryBackend,
  parseResultadoCotacaoTaxaMorada,
} from '@/src/application/mappers/CotacaoPedidoDeliveryMapper'
import type { ICotacaoPedidoDeliveryRepository } from '@/src/domain/repositories/ICotacaoPedidoDeliveryRepository'
import { cotacaoPedidoDeliveryRepository } from '@/src/infrastructure/api/repositories/CotacaoPedidoDeliveryRepository'

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export class CotarPedidoDeliveryUseCase {
  constructor(
    private readonly repo: ICotacaoPedidoDeliveryRepository = cotacaoPedidoDeliveryRepository
  ) {}

  async execute(
    input: CotacaoPedidoDeliveryBffRequest,
    token: string
  ): Promise<ResultadoCotacaoTaxaMorada> {
    const telefone = onlyDigits(input.cliente.telefone ?? '')
    if (telefone.length < 8) {
      return { status: 'erro', message: 'Informe um telefone válido para cotar a taxa.' }
    }
    if (input.produtos.length === 0) {
      return { status: 'erro', message: 'Inclua produtos para cotar a taxa.' }
    }
    if (input.tipoEntrega === 'entrega' && !input.cliente.enderecoIdEntrega?.trim()) {
      return { status: 'erro', message: 'Selecione o endereço de entrega para cotar a taxa.' }
    }

    const slug = await this.repo.buscarSlugEmpresaDelivery(token)
    const payload = montarCotacaoPedidoDeliveryBackend({
      slug,
      body: {
        tipoEntrega: input.tipoEntrega,
        cliente: {
          telefone,
          ...(input.cliente.enderecoIdEntrega?.trim()
            ? { enderecoIdEntrega: input.cliente.enderecoIdEntrega.trim() }
            : {}),
        },
        produtos: input.produtos,
      },
    })

    try {
      const raw = await this.repo.cotarPublico(payload)
      return parseResultadoCotacaoTaxaMorada(raw)
    } catch (error) {
      if (error instanceof ApiError) {
        return parseResultadoCotacaoTaxaMorada(null, {
          status: error.status,
          message: mensagemLegivelApiError(error),
        })
      }
      return {
        status: 'erro',
        message: error instanceof Error ? error.message : 'Não foi possível cotar a taxa.',
      }
    }
  }
}

export const cotarPedidoDeliveryUseCase = new CotarPedidoDeliveryUseCase()
