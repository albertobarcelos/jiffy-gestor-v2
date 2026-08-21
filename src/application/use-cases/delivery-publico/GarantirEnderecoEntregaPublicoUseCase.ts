import type {
  EnderecoFormPublico,
} from '@/src/application/dto/delivery-publico/CheckoutPublicoFormDTO'
import type {
  ClienteDeliveryPublicoDTO,
  EnderecoDeliveryPublicoInput,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { normalizarClienteDeliveryPublico } from '@/src/application/mappers/ClienteDeliveryPublicoMapper'
import {
  atualizarClienteDeliveryPublico,
  buscarClienteDeliveryPublico,
  criarClienteDeliveryPublico,
} from '@/src/infrastructure/api/publicDeliveryApi'

const MAX_ENDERECOS = 5

export type GarantirEnderecoEntregaPublicoParams = {
  telefone: string
  nome: string | null
  modoEndereco: 'existente' | 'novo'
  enderecoIdSelecionado: string | null
  /** Snapshot do lookup anterior (pode estar desatualizado). */
  clienteLookup: ClienteDeliveryPublicoDTO | null
  enderecoNovo: EnderecoFormPublico
}

function montarEnderecoPayload(form: EnderecoFormPublico): EnderecoDeliveryPublicoInput {
  const estado = form.estado.trim().toUpperCase().slice(0, 2)
  const cep = (form.cep ?? '').replace(/\D/g, '').slice(0, 8)
  const complementoParts = [form.complemento?.trim(), form.pontoReferencia?.trim()]
    .filter(Boolean)
    .join(' | ')
  return {
    etiqueta: form.etiqueta ?? 'casa',
    rua: form.rua.trim(),
    numero: form.numero.trim(),
    bairro: form.bairro.trim(),
    cidade: form.cidade.trim() || null,
    estado: estado || null,
    ...(cep.length === 8 ? { cep } : {}),
    ...(complementoParts.length > 0 ? { complemento: complementoParts } : {}),
  }
}

function localizarEnderecoCriado(
  cliente: ClienteDeliveryPublicoDTO,
  form: EnderecoFormPublico,
  idsAnteriores: Set<string>
): string {
  const novos = cliente.enderecos.filter(e => !idsAnteriores.has(e.id))
  if (novos.length === 1) return novos[0].id

  const rua = form.rua.trim().toLowerCase()
  const numero = form.numero.trim()
  const porCampos = cliente.enderecos.find(
    e => e.rua.trim().toLowerCase() === rua && e.numero.trim() === numero
  )
  if (porCampos) return porCampos.id

  if (novos.length > 0) return novos[novos.length - 1].id
  if (cliente.enderecos.length > 0) {
    return cliente.enderecos[cliente.enderecos.length - 1].id
  }

  throw new Error(
    'O endereço foi enviado, mas a resposta não trouxe o identificador. Tente novamente.'
  )
}

/**
 * Garante que o endereço de entrega exista no cadastro do cliente delivery
 * e retorna o `enderecoIdEntrega` a ser usado no pedido.
 */
export class GarantirEnderecoEntregaPublicoUseCase {
  async execute(params: GarantirEnderecoEntregaPublicoParams): Promise<string> {
    const telefone = params.telefone.replace(/\D/g, '')
    if (telefone.length < 8) {
      throw new Error('Informe um telefone válido')
    }

    if (params.modoEndereco === 'existente') {
      const id = params.enderecoIdSelecionado?.trim()
      if (!id) {
        throw new Error('Selecione um endereço de entrega')
      }
      const nome = params.nome?.trim()
      // Persiste o nome no cliente_delivery quando o usuário informou e o cadastro não tinha.
      if (nome) {
        const nomeAtual = params.clienteLookup?.nome?.trim() || ''
        if (nomeAtual !== nome) {
          await atualizarClienteDeliveryPublico(telefone, { nome })
        }
      }
      return id
    }

    if (
      !params.enderecoNovo.rua.trim() ||
      !params.enderecoNovo.numero.trim() ||
      !params.enderecoNovo.bairro.trim()
    ) {
      throw new Error('Preencha o endereço de entrega')
    }

    const enderecoPayload = montarEnderecoPayload(params.enderecoNovo)
    const nome = params.nome?.trim() || null

    let clienteAtual =
      params.clienteLookup &&
      params.clienteLookup.telefone.replace(/\D/g, '') === telefone
        ? params.clienteLookup
        : null

    if (!clienteAtual) {
      const raw = await buscarClienteDeliveryPublico(telefone)
      clienteAtual = raw ? normalizarClienteDeliveryPublico(raw) : null
    }

    if (!clienteAtual) {
      const criadoRaw = await criarClienteDeliveryPublico({
        telefone,
        nome,
        enderecos: [enderecoPayload],
      })
      const criado = normalizarClienteDeliveryPublico(criadoRaw)
      if (!criado?.enderecos.length) {
        throw new Error('Não foi possível cadastrar o endereço do cliente')
      }
      return localizarEnderecoCriado(criado, params.enderecoNovo, new Set())
    }

    if (clienteAtual.enderecos.length >= MAX_ENDERECOS) {
      throw new Error(
        'Este telefone já possui o máximo de endereços cadastrados. Escolha um endereço existente.'
      )
    }

    const idsAnteriores = new Set(clienteAtual.enderecos.map(e => e.id))
    const atualizadoRaw = await atualizarClienteDeliveryPublico(telefone, {
      ...(nome ? { nome } : {}),
      enderecos: { create: [enderecoPayload] },
    })
    const atualizado = normalizarClienteDeliveryPublico(atualizadoRaw)
    if (!atualizado) {
      throw new Error('Não foi possível salvar o novo endereço')
    }

    return localizarEnderecoCriado(atualizado, params.enderecoNovo, idsAnteriores)
  }
}

export const garantirEnderecoEntregaPublicoUseCase =
  new GarantirEnderecoEntregaPublicoUseCase()

/** @deprecated Preferir `garantirEnderecoEntregaPublicoUseCase.execute`. */
export async function garantirEnderecoEntregaPublico(
  params: GarantirEnderecoEntregaPublicoParams
): Promise<string> {
  return garantirEnderecoEntregaPublicoUseCase.execute(params)
}
