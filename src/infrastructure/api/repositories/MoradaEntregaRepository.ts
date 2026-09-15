import type { ClienteDeliveryApi } from '@/src/application/mappers/ClienteDeliveryMoradaMapper'
import {
  clienteDeliveryParaMoradas,
  extrairMoradaDeClienteDeliveryResponse,
  moradaDtoParaEnderecoDeliveryPayload,
  normalizarClienteDeliveryApi,
} from '@/src/application/mappers/ClienteDeliveryMoradaMapper'
import {
  moradaFromResponse,
  normalizarMoradaTelefone,
} from '@/src/application/mappers/MoradaTelefoneMapper'
import type { IMoradaEntregaRepository } from '@/src/domain/repositories/IMoradaEntregaRepository'
import type {
  AtualizarMoradaTelefoneDTO,
  CriarMoradaTelefoneDTO,
  MoradaTelefone,
} from '@/src/domain/types/moradaEntrega'
import { mensagemErroRespostaGestor } from '@/src/infrastructure/api/mensagemErroRespostaGestor'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import { lerEnderecoLocalizacaoDoPayloadEmpresa } from '@/src/shared/utils/geolocalizacaoEmpresa'
import {
  extrairDigitosTelefone,
  telefoneCelularBrCompleto,
} from '@/src/shared/utils/telefoneBr'

function authHeaders(token: string, json = false): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  }
}

async function throwSeNaoOk(response: Response, fallback: string): Promise<void> {
  if (response.ok) return
  const errorData = await response.json().catch(() => ({}))
  throw new Error(mensagemErroRespostaGestor(errorData, response.status, fallback))
}

export class MoradaEntregaRepository implements IMoradaEntregaRepository {
  async listarPorTelefone(
    telefone: string,
    token: string,
    usarModuloDelivery: boolean
  ): Promise<MoradaTelefone[]> {
    if (usarModuloDelivery) {
      const response = await fetchGestorApi(
        `/api/delivery/clientes/${encodeURIComponent(telefone)}`,
        { headers: authHeaders(token) }
      )
      if (response.status === 404) return []
      await throwSeNaoOk(response, 'Erro ao buscar moradas')
      const cliente = normalizarClienteDeliveryApi(await response.json())
      return cliente ? clienteDeliveryParaMoradas(cliente) : []
    }

    const response = await fetchGestorApi(
      `/api/gestor/morada-telefone?telefone=${encodeURIComponent(telefone)}`,
      { headers: { ...authHeaders(token), 'Content-Type': 'application/json' } }
    )
    await throwSeNaoOk(response, 'Erro ao buscar moradas')
    const data = await response.json()
    const listaBruta = Array.isArray(data) ? data : data.items || data.moradas || []
    return listaBruta
      .map((item: unknown) => normalizarMoradaTelefone(item))
      .filter((m: MoradaTelefone | null): m is MoradaTelefone => m != null)
  }

  async criar(
    dto: CriarMoradaTelefoneDTO,
    token: string,
    usarModuloDelivery: boolean
  ): Promise<MoradaTelefone> {
    if (usarModuloDelivery) {
      const enderecoPayload = moradaDtoParaEnderecoDeliveryPayload(dto)
      const telefone = dto.telefone.replace(/\D/g, '')
      const getResponse = await fetchGestorApi(
        `/api/delivery/clientes/${encodeURIComponent(telefone)}`,
        { headers: authHeaders(token) }
      )

      if (getResponse.ok) {
        const patchResponse = await fetchGestorApi(
          `/api/delivery/clientes/${encodeURIComponent(telefone)}`,
          {
            method: 'PATCH',
            headers: authHeaders(token, true),
            body: JSON.stringify({ enderecos: { create: [enderecoPayload] } }),
          }
        )
        await throwSeNaoOk(patchResponse, 'Erro ao criar morada')
        return extrairMoradaDeClienteDeliveryResponse(await patchResponse.json(), dto)
      }

      if (getResponse.status !== 404) {
        await throwSeNaoOk(getResponse, 'Erro ao criar morada')
      }

      const postResponse = await fetchGestorApi('/api/delivery/clientes', {
        method: 'POST',
        headers: authHeaders(token, true),
        body: JSON.stringify({ telefone, enderecos: [enderecoPayload] }),
      })
      await throwSeNaoOk(postResponse, 'Erro ao criar morada')
      return extrairMoradaDeClienteDeliveryResponse(await postResponse.json(), dto)
    }

    const response = await fetchGestorApi('/api/gestor/morada-telefone', {
      method: 'POST',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    })
    await throwSeNaoOk(response, 'Erro ao criar morada')
    return moradaFromResponse(response, dto)
  }

  async atualizar(
    id: string,
    dto: AtualizarMoradaTelefoneDTO,
    token: string,
    usarModuloDelivery: boolean
  ): Promise<MoradaTelefone> {
    if (usarModuloDelivery) {
      const telefone = dto.telefone.replace(/\D/g, '')
      const enderecoPayload = moradaDtoParaEnderecoDeliveryPayload(dto)
      const response = await fetchGestorApi(
        `/api/delivery/clientes/${encodeURIComponent(telefone)}`,
        {
          method: 'PATCH',
          headers: authHeaders(token, true),
          body: JSON.stringify({
            enderecos: { update: [{ id, ...enderecoPayload }] },
          }),
        }
      )
      await throwSeNaoOk(response, 'Erro ao atualizar morada')
      return extrairMoradaDeClienteDeliveryResponse(await response.json(), dto, id)
    }

    const response = await fetchGestorApi(
      `/api/gestor/morada-telefone/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
      }
    )
    await throwSeNaoOk(response, 'Erro ao atualizar morada')
    return moradaFromResponse(response, dto)
  }

  async excluir(
    id: string,
    telefoneDigitos: string,
    token: string,
    usarModuloDelivery: boolean
  ): Promise<void> {
    const telefone = telefoneDigitos.replace(/\D/g, '')
    if (!id.trim() || !telefone) {
      throw new Error('Endereço ou telefone inválido')
    }

    if (usarModuloDelivery) {
      const response = await fetchGestorApi(
        `/api/delivery/clientes/${encodeURIComponent(telefone)}`,
        {
          method: 'PATCH',
          headers: authHeaders(token, true),
          body: JSON.stringify({ enderecos: { delete: [id] } }),
        }
      )
      await throwSeNaoOk(response, 'Erro ao remover endereço')
      return
    }

    const response = await fetchGestorApi(
      `/api/gestor/morada-telefone/${encodeURIComponent(id)}`,
      { method: 'DELETE', headers: authHeaders(token) }
    )
    await throwSeNaoOk(response, 'Erro ao remover endereço')
  }

  async registrarUso(
    id: string,
    telefoneDigitos: string,
    token: string,
    usarModuloDelivery: boolean
  ): Promise<void> {
    if (usarModuloDelivery) return

    const response = await fetchGestorApi(
      `/api/gestor/morada-telefone/${encodeURIComponent(id)}/registrar-uso`,
      {
        method: 'POST',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      }
    )
    await throwSeNaoOk(response, 'Erro ao registrar uso do endereço')
  }

  async buscarGeoEmpresa(token: string): Promise<{ enderecoLocalizacao: GeoJsonPoint | null }> {
    const res = await fetchGestorApi('/api/empresas/me', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(typeof body.error === 'string' ? body.error : `Erro ${res.status}`)
    }
    const data = await res.json()
    const endereco =
      data.endereco && typeof data.endereco === 'object' && !Array.isArray(data.endereco)
        ? data.endereco
        : null
    return lerEnderecoLocalizacaoDoPayloadEmpresa(endereco)
  }

  async buscarClienteDeliveryPorTelefone(
    telefone: string,
    token: string
  ): Promise<ClienteDeliveryApi | null> {
    const digitos = extrairDigitosTelefone(telefone)
    if (!telefoneCelularBrCompleto(digitos)) {
      throw new Error('Informe o celular completo com DDD (11 dígitos).')
    }
    const response = await fetchGestorApi(
      `/api/delivery/clientes/${encodeURIComponent(digitos)}`,
      { headers: authHeaders(token) }
    )
    if (response.status === 404) return null
    await throwSeNaoOk(response, 'Erro ao buscar cliente delivery')
    return normalizarClienteDeliveryApi(await response.json())
  }

  async criarClienteDeliveryRapido(
    input: { telefone: string; nome: string },
    token: string
  ): Promise<ClienteDeliveryApi> {
    const telefone = extrairDigitosTelefone(input.telefone)
    if (!telefoneCelularBrCompleto(telefone)) {
      throw new Error('Informe o celular completo com DDD (11 dígitos).')
    }
    const response = await fetchGestorApi('/api/delivery/clientes', {
      method: 'POST',
      headers: authHeaders(token, true),
      body: JSON.stringify({ telefone, nome: input.nome.trim() }),
    })
    await throwSeNaoOk(response, 'Erro ao cadastrar cliente delivery')
    const cliente = normalizarClienteDeliveryApi(await response.json())
    if (!cliente) {
      throw new Error('Resposta inválida ao cadastrar cliente delivery')
    }
    return cliente
  }

  async atualizarNomeClienteDelivery(
    input: { telefone: string; nome: string },
    token: string
  ): Promise<ClienteDeliveryApi | null> {
    const telefone = extrairDigitosTelefone(input.telefone)
    if (!telefoneCelularBrCompleto(telefone)) {
      throw new Error('Informe o celular completo com DDD (11 dígitos).')
    }
    const nome = input.nome.trim()
    if (!nome) throw new Error('Informe o nome do cliente.')
    const response = await fetchGestorApi(
      `/api/delivery/clientes/${encodeURIComponent(telefone)}`,
      {
        method: 'PATCH',
        headers: authHeaders(token, true),
        body: JSON.stringify({ nome }),
      }
    )
    await throwSeNaoOk(response, 'Erro ao atualizar nome do cliente')
    const data = await response.json().catch(() => ({}))
    return normalizarClienteDeliveryApi(data)
  }
}

export const moradaEntregaRepository = new MoradaEntregaRepository()
