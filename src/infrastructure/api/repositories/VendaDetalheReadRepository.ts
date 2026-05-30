import type { VendaGestorApiResponse } from '@/src/application/dto/api/vendaGestorApi'
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
  async loadVenda(
    vendaId: string,
    tabelaOrigem: TabelaOrigemVenda,
    token: string,
    options?: LoadVendaOptions
  ): Promise<VendaGestorApiResponse> {
    const incluirFiscal = options?.incluirFiscal !== false
    const fiscalQuery = incluirFiscal ? 'true' : 'false'
    const url =
      tabelaOrigem === 'venda'
        ? `/api/vendas/${vendaId}?incluirFiscal=${fiscalQuery}`
        : `/api/vendas/gestor/${vendaId}?incluirFiscal=${fiscalQuery}`

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

  fetchCliente(clienteId: string, token: string) {
    return fetchJson<Record<string, unknown>>(`/api/clientes/${clienteId}`, token)
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
