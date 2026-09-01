import type {
  CheckoutFormData,
  PedidoPublicoCarrinhoItemInput,
} from '@/src/application/dto/delivery-publico/CheckoutPublicoFormDTO'
import type { CreatePedidoPublicoResponseDTO } from '@/src/application/dto/delivery-publico/CreatePedidoPublicoResponseDTO'
import type { CotacaoPedidoPublicoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import {
  CreatePedidoPublicoInputSchema,
  type ClienteDeliveryPublicoDTO,
  type CreatePedidoPublicoInput,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { normalizarClienteDeliveryPublico } from '@/src/application/mappers/ClienteDeliveryPublicoMapper'
import { montarPedidoPublico } from '@/src/application/mappers/MontarPedidoPublicoMapper'
import { garantirEnderecoEntregaPublicoUseCase } from '@/src/application/use-cases/delivery-publico/GarantirEnderecoEntregaPublicoUseCase'
import {
  atualizarClienteDeliveryPublico,
  buscarClienteDeliveryPublico,
  criarPedidoPublico,
  isCotacaoDesatualizadaError,
} from '@/src/infrastructure/api/publicDeliveryApi'

export type EnviarPedidoPublicoInput = {
  slug: string
  telefoneApi: string
  nomeEfetivo: string | null
  itens: PedidoPublicoCarrinhoItemInput[]
  total: number
  form: CheckoutFormData
  clienteLookup: ClienteDeliveryPublicoDTO | null
  tokenCotacao: string
}

export type EnviarPedidoPublicoResult =
  | {
      ok: true
      clienteAtualizado: ClienteDeliveryPublicoDTO | null
      pedido: CreatePedidoPublicoResponseDTO
    }
  | {
      ok: false
      reason: 'cotacao_desatualizada'
      message: string
      cotacao: CotacaoPedidoPublicoDTO
    }
  | { ok: false; error: string }

/**
 * Orquestra envio do pedido público:
 * garante endereço (se entrega) → monta payload → PATCH CPF se necessário → create.
 */
export class EnviarPedidoPublicoUseCase {
  async execute(input: EnviarPedidoPublicoInput): Promise<EnviarPedidoPublicoResult> {
    const tel = input.telefoneApi.replace(/\D/g, '')
    if (tel.length < 8) {
      return { ok: false, error: 'Informe um telefone válido' }
    }
    if (input.itens.length === 0) {
      return { ok: false, error: 'Carrinho vazio' }
    }
    if (!input.tokenCotacao.trim()) {
      return { ok: false, error: 'Cotação do pedido não encontrada. Aguarde a atualização dos valores.' }
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

    const resultado = montarPedidoPublico({
      slug: input.slug,
      itens: input.itens,
      total: input.total,
      form: formComNome,
      enderecoIdEntrega,
      telefoneApi: tel,
      tokenCotacao: input.tokenCotacao,
    })
    if (!resultado.ok) {
      return resultado
    }

    const parsed = CreatePedidoPublicoInputSchema.safeParse(resultado.payload)
    if (!parsed.success) {
      return { ok: false, error: 'Dados do pedido inválidos' }
    }
    const payload: CreatePedidoPublicoInput = parsed.data

    let clienteAtualizado: ClienteDeliveryPublicoDTO | null = null
    const cpfPedido = payload.documentoCpfCnpj?.replace(/\D/g, '') ?? ''
    if (cpfPedido.length === 11) {
      const rawAtual = await buscarClienteDeliveryPublico(tel)
      const cpfAtual = rawAtual?.cpf?.replace(/\D/g, '') ?? ''
      if (rawAtual && !cpfAtual) {
        const atualizadoRaw = await atualizarClienteDeliveryPublico(tel, {
          cpf: cpfPedido,
        })
        clienteAtualizado = normalizarClienteDeliveryPublico(atualizadoRaw)
      }
    }

    try {
      const pedido = await criarPedidoPublico(payload)
      return { ok: true, clienteAtualizado, pedido }
    } catch (error) {
      if (isCotacaoDesatualizadaError(error)) {
        return {
          ok: false,
          reason: 'cotacao_desatualizada',
          message: error.message,
          cotacao: error.cotacao,
        }
      }
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao enviar pedido',
      }
    }
  }
}

export const enviarPedidoPublicoUseCase = new EnviarPedidoPublicoUseCase()
