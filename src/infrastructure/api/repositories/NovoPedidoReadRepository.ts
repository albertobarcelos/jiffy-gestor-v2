import { Produto } from '@/src/domain/entities/Produto'
import type {
  CanalVendaCatalogo,
  INovoPedidoReadRepository,
} from '@/src/domain/repositories/INovoPedidoReadRepository'
import type { UsuarioPdvEntregadorOption } from '@/src/domain/types/vendaDetalhe'

const PRODUTOS_POR_PAGINA = 100

async function fetchJson<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      (errorData as { error?: string; message?: string }).error ||
        (errorData as { error?: string; message?: string }).message ||
        'Erro na requisição'
    )
  }

  return (await response.json()) as T
}

export class NovoPedidoReadRepository implements INovoPedidoReadRepository {
  async listarEntregadores(token: string): Promise<UsuarioPdvEntregadorOption[]> {
    const data = await fetchJson<{ items?: unknown[] }>(
      '/api/usuarios-pdv/entregadores?limit=100&offset=0',
      token
    )
    const items = Array.isArray(data.items) ? data.items : []
    return items
      .filter((item: unknown) => {
        if (!item || typeof item !== 'object') return false
        const tipo = String((item as Record<string, unknown>).tipoUsuarioPdv ?? '')
          .trim()
          .toLowerCase()
        return tipo === 'entregador'
      })
      .map((item: unknown) => {
        const row = item as Record<string, unknown>
        return {
          id: String(row.id ?? row.usuarioId ?? ''),
          nome: String(row.nome ?? row.name ?? '').trim(),
          telefone: row.telefone != null ? String(row.telefone) : undefined,
        }
      })
      .filter((item: UsuarioPdvEntregadorOption) => item.id && item.nome)
  }

  async listarProdutosDoGrupo(
    grupoId: string,
    token: string
  ): Promise<{ produtos: Produto[]; count: number }> {
    const produtos: Produto[] = []
    let offset = 0

    while (true) {
      const data = await fetchJson<{
        items?: unknown[]
        nextOffset?: number | null
      }>(
        `/api/grupos-produtos/${grupoId}/produtos?limit=${PRODUTOS_POR_PAGINA}&offset=${offset}`,
        token
      )
      const items = Array.isArray(data.items) ? data.items : []
      produtos.push(...items.map(item => Produto.fromJSON(item)))

      if (items.length < PRODUTOS_POR_PAGINA) break

      if (typeof data.nextOffset === 'number') {
        offset = data.nextOffset
        continue
      }

      offset += PRODUTOS_POR_PAGINA
    }

    return { produtos, count: produtos.length }
  }

  async listarGrupoIdsComProdutosAtivos(
    token: string,
    canal: CanalVendaCatalogo
  ): Promise<Set<string>> {
    const grupoIds = new Set<string>()
    let offset = 0

    while (true) {
      const params = new URLSearchParams({
        ativo: 'true',
        limit: String(PRODUTOS_POR_PAGINA),
        offset: String(offset),
      })
      if (canal === 'entrega') {
        params.set('ativoDelivery', 'true')
      } else {
        params.set('ativoLocal', 'true')
      }

      const data = await fetchJson<{ items?: unknown[] }>(
        `/api/produtos?${params.toString()}`,
        token
      )
      const items = Array.isArray(data.items) ? data.items : []

      for (const item of items) {
        const produto = Produto.fromJSON(item)
        if (!produto.isAtivo()) continue
        const grupoId = produto.getGrupoId()?.trim()
        if (grupoId) grupoIds.add(grupoId)
      }

      if (items.length < PRODUTOS_POR_PAGINA) break
      offset += PRODUTOS_POR_PAGINA
    }

    return grupoIds
  }

  async buscarProdutosPorNome(nome: string, token: string): Promise<Produto[]> {
    const filtro = nome.trim()
    if (filtro.length < 2) return []
    const data = await fetchJson<{ items?: unknown[] }>(
      `/api/produtos?name=${encodeURIComponent(filtro)}&ativo=true&limit=50`,
      token
    )
    const items = Array.isArray(data.items) ? data.items : []
    return items.map(item => Produto.fromJSON(item))
  }

  async buscarProdutoPorId(produtoId: string, token: string): Promise<Produto | null> {
    try {
      const data = await fetchJson<unknown>(
        `/api/produtos/${encodeURIComponent(produtoId)}`,
        token
      )
      return Produto.fromJSON(data)
    } catch {
      return null
    }
  }

  async buscarClienteJson(
    clienteId: string,
    token: string
  ): Promise<Record<string, unknown> | null> {
    try {
      return await fetchJson<Record<string, unknown>>(
        `/api/clientes/${encodeURIComponent(clienteId)}`,
        token
      )
    } catch {
      return null
    }
  }

  async atualizarPagamentosVendaGestor(
    vendaId: string,
    token: string,
    pagamentos: Array<{ meioPagamentoId: string; valor: number }>
  ): Promise<void> {
    await fetchJson<unknown>(`/api/vendas/gestor/${vendaId}`, token, {
      method: 'PATCH',
      body: JSON.stringify({ pagamentos }),
    })
  }

  async buscarAuthMe(token: string): Promise<Record<string, unknown> | null> {
    try {
      return await fetchJson<Record<string, unknown>>('/api/auth/me', token, {
        method: 'GET',
      })
    } catch {
      return null
    }
  }

  async buscarUsuarioGestor(
    usuarioId: string,
    token: string
  ): Promise<Record<string, unknown> | null> {
    try {
      return await fetchJson<Record<string, unknown>>(
        `/api/pessoas/usuarios-gestor/${usuarioId}`,
        token,
        { method: 'GET' }
      )
    } catch {
      return null
    }
  }
}

export const novoPedidoReadRepository = new NovoPedidoReadRepository()
