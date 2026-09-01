import type {
  EnderecoFormPublico,
} from '@/src/application/dto/delivery-publico/CheckoutPublicoFormDTO'
import type { EnderecoGeoCheckoutInput } from '@/src/application/dto/delivery-publico/EnderecoGeoCheckoutDTO'
import type {
  ClienteDeliveryPublicoDTO,
  EnderecoDeliveryPublicoInput,
  EnderecoClienteDeliveryPublicoDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { normalizarClienteDeliveryPublico } from '@/src/application/mappers/ClienteDeliveryPublicoMapper'
import {
  atualizarClienteDeliveryPublico,
  buscarClienteDeliveryPublico,
  criarClienteDeliveryPublico,
} from '@/src/infrastructure/api/publicDeliveryApi'
import {
  enderecoTemGeolocalizacao,
  montarPayloadGeoEnderecoDelivery,
} from '@/src/shared/utils/geolocalizacaoEnderecoDelivery'
import {
  mesclarEnderecoComReverseGeocode,
  normalizarCepEndereco,
  resolverEnderecoPorCoordenadas,
  type EnderecoGeocodeInput,
} from '@/src/shared/utils/geolocalizacaoEnderecoShared'

const MAX_ENDERECOS = 5

export type GarantirEnderecoEntregaPublicoParams = {
  telefone: string
  nome: string | null
  modoEndereco: 'existente' | 'novo'
  enderecoIdSelecionado: string | null
  /** Snapshot do lookup anterior (pode estar desatualizado). */
  clienteLookup: ClienteDeliveryPublicoDTO | null
  enderecoNovo: EnderecoFormPublico
  /** Geolocalização obrigatória para entrega (novo endereço ou backfill). */
  geo?: EnderecoGeoCheckoutInput | null
}

function enderecoCadastroParaGeocodeInput(
  endereco: EnderecoClienteDeliveryPublicoDTO
): EnderecoGeocodeInput {
  return {
    rua: endereco.rua,
    numero: endereco.numero,
    bairro: endereco.bairro,
    cidade: endereco.cidade ?? '',
    estado: endereco.estado ?? '',
    cep: endereco.cep ?? '',
    complemento: endereco.complemento ?? '',
  }
}

function enderecoFormParaGeocodeInput(form: EnderecoFormPublico): EnderecoGeocodeInput {
  return {
    rua: form.rua,
    numero: form.numero,
    bairro: form.bairro,
    cidade: form.cidade,
    estado: form.estado,
    cep: form.cep ?? '',
    complemento: form.complemento ?? '',
  }
}

function montarTextoEnderecoPayload(
  base: EnderecoGeocodeInput,
  etiqueta: 'casa' | 'trabalho' | 'outro',
  pontoReferencia?: string | null
): Omit<EnderecoDeliveryPublicoInput, 'enderecoLocalizacao' | 'preferenciaEntrega'> {
  const estado = (base.estado ?? '').trim().toUpperCase().slice(0, 2)
  const cep = normalizarCepEndereco(base.cep).slice(0, 8)
  const complementoParts = [base.complemento?.trim(), pontoReferencia?.trim()]
    .filter(Boolean)
    .join(' | ')

  return {
    etiqueta,
    rua: base.rua.trim(),
    numero: base.numero.trim(),
    bairro: (base.bairro ?? '').trim(),
    cidade: (base.cidade ?? '').trim() || null,
    estado: estado || null,
    ...(cep.length === 8 ? { cep } : {}),
    ...(complementoParts.length > 0 ? { complemento: complementoParts } : {}),
  }
}

async function resolverGeoParaPersistencia(
  geo: EnderecoGeoCheckoutInput
): Promise<EnderecoGeoCheckoutInput> {
  if (geo.modoAjustePin !== 'atualizar_endereco') {
    return geo
  }

  if (geo.enderecoRevertido?.rua?.trim()) {
    return geo
  }

  const [lng, lat] = geo.pinPosition.coordinates
  const enderecoRevertido = await resolverEnderecoPorCoordenadas(lat, lng)
  return { ...geo, enderecoRevertido }
}

function montarEnderecoPayload(
  form: EnderecoFormPublico,
  geo?: EnderecoGeoCheckoutInput | null
): EnderecoDeliveryPublicoInput {
  let textoBase = enderecoFormParaGeocodeInput(form)

  if (geo?.modoAjustePin === 'atualizar_endereco' && geo.enderecoRevertido) {
    textoBase = mesclarEnderecoComReverseGeocode(textoBase, geo.enderecoRevertido)
  }

  const base = montarTextoEnderecoPayload(
    textoBase,
    form.etiqueta ?? 'casa',
    form.pontoReferencia
  )

  if (!geo?.enderecoLocalizacao || !geo.pinPosition) {
    return base
  }

  const geoPayload = montarPayloadGeoEnderecoDelivery({
    enderecoLocalizacao: geo.enderecoLocalizacao,
    pinPosition: geo.pinPosition,
    providerEnderecoId: geo.providerEnderecoId,
    modoAjustePin: geo.modoAjustePin,
  })

  return {
    ...base,
    ...geoPayload,
  }
}

function montarUpdatePayloadExistente(
  endereco: EnderecoClienteDeliveryPublicoDTO,
  geo: EnderecoGeoCheckoutInput
): EnderecoDeliveryPublicoInput & { id: string } {
  let textoBase = enderecoCadastroParaGeocodeInput(endereco)

  if (geo.modoAjustePin === 'atualizar_endereco' && geo.enderecoRevertido) {
    textoBase = mesclarEnderecoComReverseGeocode(textoBase, geo.enderecoRevertido)
  }

  const geoPayload = montarPayloadGeoEnderecoDelivery({
    enderecoLocalizacao: geo.enderecoLocalizacao,
    pinPosition: geo.pinPosition,
    providerEnderecoId: geo.providerEnderecoId,
    modoAjustePin: geo.modoAjustePin,
  })

  const etiqueta = (endereco.etiqueta as 'casa' | 'trabalho' | 'outro') || 'casa'

  return {
    id: endereco.id,
    ...montarTextoEnderecoPayload(textoBase, etiqueta),
    ...geoPayload,
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

function localizarEnderecoPorId(
  clienteLookup: ClienteDeliveryPublicoDTO | null,
  enderecoId: string
): EnderecoClienteDeliveryPublicoDTO | null {
  return clienteLookup?.enderecos.find(e => e.id === enderecoId) ?? null
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
      if (nome) {
        const nomeAtual = params.clienteLookup?.nome?.trim() || ''
        if (nomeAtual !== nome) {
          await atualizarClienteDeliveryPublico(telefone, { nome })
        }
      }

      const enderecoAtual = localizarEnderecoPorId(params.clienteLookup, id)
      const geoInformada = Boolean(
        params.geo?.enderecoLocalizacao && params.geo.pinPosition
      )
      const precisaPersistirGeo =
        geoInformada &&
        Boolean(
          !enderecoAtual ||
            !enderecoTemGeolocalizacao(enderecoAtual) ||
            params.geo?.modoAjustePin === 'atualizar_endereco' ||
            params.geo?.modoAjustePin === 'preferencia_entrega' ||
            params.geo?.enderecoRevertido
        )

      if (enderecoAtual && precisaPersistirGeo && params.geo) {
        const geoResolvida = await resolverGeoParaPersistencia(params.geo)
        const updatePayload = montarUpdatePayloadExistente(enderecoAtual, geoResolvida)
        const atualizadoRaw = await atualizarClienteDeliveryPublico(telefone, {
          enderecos: { update: [updatePayload] },
        })
        const atualizado = normalizarClienteDeliveryPublico(atualizadoRaw)
        const enderecoPersistido = atualizado?.enderecos.find(e => e.id === id)
        if (!enderecoPersistido || !enderecoTemGeolocalizacao(enderecoPersistido)) {
          throw new Error('Não foi possível salvar a localização do endereço.')
        }
      } else if (enderecoAtual && !enderecoTemGeolocalizacao(enderecoAtual)) {
        throw new Error(
          'Este endereço precisa de confirmação no mapa antes de continuar.'
        )
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

    if (!params.geo?.enderecoLocalizacao || !params.geo.pinPosition) {
      throw new Error('Confirme a localização no mapa antes de salvar o endereço.')
    }

    const geoResolvida = params.geo ? await resolverGeoParaPersistencia(params.geo) : null
    const enderecoPayload = montarEnderecoPayload(params.enderecoNovo, geoResolvida)
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
