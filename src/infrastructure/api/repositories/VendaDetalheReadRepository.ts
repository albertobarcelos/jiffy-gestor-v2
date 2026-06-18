import type { VendaGestorApiResponse } from '@/src/application/dto/api/vendaGestorApi'
import {
  adaptPedidoDeliveryToVendaGestorApiResponse,
  deveUsarModuloDeliveryParaDetalhe,
} from '@/src/application/mappers/PedidoDeliveryDetalheAdapter'
import { salvarPedidoDeliveryDetalheCache } from '@/src/infrastructure/api/pedidoDeliveryDetalheCache'
import type {
  IVendaDetalheReadRepository,
  LoadVendaOptions,
} from '@/src/domain/repositories/IVendaDetalheReadRepository'
import type { TabelaOrigemVenda } from '@/src/domain/types/vendaDetalhe'

async function fetchJson<T>(url: string, token: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    return null
  }
}

export class VendaDetalheReadRepository implements IVendaDetalheReadRepository {
  private async fetchPedidoDelivery(
    vendaId: string,
    token: string
  ): Promise<VendaGestorApiResponse | null> {
    const response = await fetch(`/api/delivery/pedidos/${encodeURIComponent(vendaId)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    })
    if (response.status === 404) return null
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        (errorData as { error?: string; message?: string }).error ||
          (errorData as { error?: string; message?: string }).message ||
          'Erro ao carregar pedido delivery'
      )
    }
    const raw = await response.json()
    salvarPedidoDeliveryDetalheCache(vendaId, raw)
    return adaptPedidoDeliveryToVendaGestorApiResponse(raw)
  }

  private async fetchVendaGestor(
    vendaId: string,
    token: string,
    incluirFiscal: boolean
  ): Promise<VendaGestorApiResponse> {
    const fiscalQuery = incluirFiscal ? 'true' : 'false'
    const response = await fetch(
      `/api/vendas/gestor/${vendaId}?incluirFiscal=${fiscalQuery}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        (errorData as { error?: string; message?: string }).error ||
          (errorData as { error?: string; message?: string }).message ||
          'Erro ao carregar venda'
      )
    }

    return (await response.json()) as VendaGestorApiResponse
  }

  async loadVenda(
    vendaId: string,
    tabelaOrigem: TabelaOrigemVenda,
    token: string,
    options?: LoadVendaOptions
  ): Promise<VendaGestorApiResponse> {
    const incluirFiscal = options?.incluirFiscal !== false

    if (tabelaOrigem === 'venda') {
      const url = `/api/vendas/${vendaId}?incluirFiscal=${incluirFiscal ? 'true' : 'false'}`
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          (errorData as { error?: string; message?: string }).error ||
            (errorData as { error?: string; message?: string }).message ||
            'Erro ao carregar venda'
        )
      }
      return (await response.json()) as VendaGestorApiResponse
    }

    const preferirDelivery =
      options?.preferirModuloDelivery ?? deveUsarModuloDeliveryParaDetalhe(tabelaOrigem)

    if (preferirDelivery) {
      const delivery = await this.fetchPedidoDelivery(vendaId, token)
      if (delivery) return delivery
    }

    return this.fetchVendaGestor(vendaId, token, incluirFiscal)
  }

  fetchCliente(clienteId: string, token: string) {
    return fetchJson<Record<string, unknown>>(`/api/clientes/${clienteId}`, token)
  }

  fetchClienteDeliveryByTelefone(telefone: string, token: string) {
    const digits = telefone.replace(/\D/g, '')
    if (digits.length < 10) return Promise.resolve(null)
    return fetchJson<Record<string, unknown>>(
      `/api/delivery/clientes/${encodeURIComponent(digits)}`,
      token
    )
  }

  fetchUsuarioPdv(usuarioId: string, token: string) {
    return fetchJson<Record<string, unknown>>(`/api/usuarios/${usuarioId}`, token)
  }

  fetchUsuarioGestor(usuarioId: string, token: string) {
    return fetchJson<Record<string, unknown>>(
      `/api/pessoas/usuarios-gestor/${usuarioId}`,
      token
    )
  }

  fetchMeioPagamento(meioId: string, token: string) {
    return fetchJson<Record<string, unknown>>(`/api/meios-pagamentos/${meioId}`, token)
  }
}

export const vendaDetalheReadRepository = new VendaDetalheReadRepository()
