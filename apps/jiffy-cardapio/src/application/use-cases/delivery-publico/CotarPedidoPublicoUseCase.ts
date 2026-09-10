import type {
  CheckoutFormData,
  PedidoPublicoCarrinhoItemInput,
} from '@/src/application/dto/delivery-publico/CheckoutPublicoFormDTO'
import type { CotacaoPedidoPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import {
  CotacaoPedidoPublicoInputSchema,
  type ClienteDeliveryPublicoDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { montarCotacaoPublico } from '@/src/application/mappers/MontarPedidoPublicoMapper'
import { garantirEnderecoEntregaPublicoUseCase } from '@/src/application/use-cases/delivery-publico/GarantirEnderecoEntregaPublicoUseCase'
import {
  cotarPedidoPublico,
  formatarMensagemErroCotacaoPublica,
  PublicDeliveryApiError,
} from '@/src/infrastructure/api/publicDeliveryApi'

export type CotarPedidoPublicoInput = {
  slug: string
  telefoneApi: string
  nomeEfetivo: string | null
  itens: PedidoPublicoCarrinhoItemInput[]
  form: CheckoutFormData
  clienteLookup: ClienteDeliveryPublicoDTO | null
}

export type CotarPedidoPublicoResult =
  | { ok: true; cotacao: CotacaoPedidoPublicoDTO }
  | { ok: false; error: string; httpStatus?: number }

/**
 * Garante endereço (se entrega) → monta payload de cotação → POST /delivery/cotacao.
 */
export class CotarPedidoPublicoUseCase {
  async execute(input: CotarPedidoPublicoInput): Promise<CotarPedidoPublicoResult> {
    const tel = input.telefoneApi.replace(/\D/g, '')
    if (tel.length < 8) {
      return { ok: false, error: 'Informe um telefone válido' }
    }
    if (input.itens.length === 0) {
      return { ok: false, error: 'Carrinho vazio' }
    }

    let enderecoIdEntrega: string | null = null
    const formComNome: CheckoutFormData = {
      ...input.form,
      nome: input.nomeEfetivo ?? input.form.nome,
    }

    if (formComNome.tipoEntrega === 'entrega') {
      try {
        enderecoIdEntrega = await garantirEnderecoEntregaPublicoUseCase.execute({
          telefone: tel,
          nome: input.nomeEfetivo,
          modoEndereco: formComNome.modoEndereco,
          enderecoIdSelecionado: formComNome.enderecoIdSelecionado || null,
          clienteLookup: input.clienteLookup,
          enderecoNovo: {
            rua: formComNome.rua,
            numero: formComNome.numero,
            bairro: formComNome.bairro,
            cidade: formComNome.cidade,
            estado: formComNome.estado,
            cep: formComNome.cep,
            complemento: formComNome.complemento,
            pontoReferencia: formComNome.pontoReferencia,
            etiqueta: formComNome.etiquetaEndereco,
          },
        })
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : 'Erro ao resolver endereço',
        }
      }
    }

    const resultado = montarCotacaoPublico({
      slug: input.slug,
      itens: input.itens,
      total: 0,
      form: formComNome,
      enderecoIdEntrega,
      telefoneApi: tel,
    })
    if (!resultado.ok) {
      return resultado
    }

    const parsed = CotacaoPedidoPublicoInputSchema.safeParse(resultado.payload)
    if (!parsed.success) {
      return { ok: false, error: 'Dados da cotação inválidos' }
    }

    try {
      const cotacao = await cotarPedidoPublico(parsed.data)
      return { ok: true, cotacao }
    } catch (error) {
      if (error instanceof PublicDeliveryApiError) {
        return {
          ok: false,
          error: formatarMensagemErroCotacaoPublica(error.status, error.message),
          httpStatus: error.status,
        }
      }
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao cotar pedido',
      }
    }
  }
}

export const cotarPedidoPublicoUseCase = new CotarPedidoPublicoUseCase()
