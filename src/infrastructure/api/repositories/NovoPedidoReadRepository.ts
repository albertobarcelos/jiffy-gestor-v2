import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { Produto } from '@/src/domain/entities/Produto'
import type { INovoPedidoReadRepository } from '@/src/domain/repositories/INovoPedidoReadRepository'
import {
  mergeProdutoComSnapshotMenu,
  menuProdutoToProduto,
} from '@/src/application/mappers/MenuProdutoCatalogMapper'
import { normalizarListaEntregadoresDelivery } from '@/src/application/mappers/EntregadorDeliveryNormalizer'
import type { UsuarioPdvEntregadorOption } from '@/src/domain/types/vendaDetalhe'
import {
  fetchAllMenuProdutos,
  fetchMenuProdutoSnapshot,
} from '@/src/infrastructure/api/repositories/menuCatalogFetch'

async function fetchJson<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetchGestorApi(url, {
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

  async listarEntregadoresDelivery(token: string): Promise<UsuarioPdvEntregadorOption[]> {
    const data = await fetchJson<unknown>(
      '/api/delivery/entregadores?ativo=true&limit=100&offset=0',
      token
    )
    return normalizarListaEntregadoresDelivery(data)
  }

  async listarProdutosDoGrupo(
    grupoId: string,
    token: string,
    menuId: string | null
  ): Promise<{ produtos: Produto[]; count: number }> {
    if (!menuId) return { produtos: [], count: 0 }

    const snapshots = await fetchAllMenuProdutos(menuId, token, {
      grupoProdutoId: grupoId,
      ativo: true,
      tipo: 'all',
    })
    const produtos = snapshots
      .filter(item => item.ativo !== false)
      .map(item => menuProdutoToProduto(item))
      .sort((a, b) => {
        const ordemA = a.getOrdem() ?? Number.MAX_SAFE_INTEGER
        const ordemB = b.getOrdem() ?? Number.MAX_SAFE_INTEGER
        if (ordemA !== ordemB) return ordemA - ordemB
        return a.getNome().localeCompare(b.getNome(), 'pt-BR')
      })

    return { produtos, count: produtos.length }
  }

  async listarGrupoIdsComProdutosAtivos(
    token: string,
    menuId: string | null
  ): Promise<Set<string>> {
    if (!menuId) return new Set()

    const snapshots = await fetchAllMenuProdutos(menuId, token, { ativo: true, tipo: 'all' })
    const grupoIds = new Set<string>()
    for (const item of snapshots) {
      if (item.ativo === false) continue
      const grupoId = item.grupoProduto?.id?.trim()
      if (grupoId) grupoIds.add(grupoId)
    }
    return grupoIds
  }

  async buscarProdutosPorNome(
    nome: string,
    token: string,
    menuId: string | null
  ): Promise<Produto[]> {
    const filtro = nome.trim()
    if (filtro.length < 2 || !menuId) return []

    const snapshots = await fetchAllMenuProdutos(menuId, token, {
      q: filtro,
      ativo: true,
      tipo: 'all',
    })

    return snapshots
      .filter(item => item.ativo !== false)
      .map(item => menuProdutoToProduto(item))
      .sort((a, b) => a.getNome().localeCompare(b.getNome(), 'pt-BR'))
  }

  async buscarProdutoPorId(
    produtoId: string,
    token: string,
    menuId?: string | null
  ): Promise<Produto | null> {
    let base: Produto | null = null
    try {
      const data = await fetchJson<unknown>(
        `/api/produtos/${encodeURIComponent(produtoId)}`,
        token
      )
      base = Produto.fromJSON(data)
    } catch {
      base = null
    }

    if (!menuId) return base

    const snapshot = await fetchMenuProdutoSnapshot(menuId, produtoId, token)
    if (snapshot && base) return mergeProdutoComSnapshotMenu(base, snapshot)
    if (snapshot) return menuProdutoToProduto(snapshot, base)
    return base
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

  async buscarPedidoDelivery(pedidoId: string, token: string): Promise<Record<string, unknown>> {
    const raw = await fetchJson<unknown>(
      `/api/delivery/pedidos/${encodeURIComponent(pedidoId)}`,
      token
    )
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const o = raw as Record<string, unknown>
      if (o.data != null && typeof o.data === 'object' && !Array.isArray(o.data)) {
        return o.data as Record<string, unknown>
      }
      return o
    }
    return {}
  }

  async patchPedidoDelivery(
    pedidoId: string,
    token: string,
    body: Record<string, unknown>
  ): Promise<void> {
    await fetchJson<unknown>(`/api/delivery/pedidos/${encodeURIComponent(pedidoId)}`, token, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  }

  async emitirNotaPedidoDelivery(
    pedidoId: string,
    token: string,
    modelo: 55 | 65
  ): Promise<Record<string, unknown>> {
    const raw = await fetchJson<unknown>(
      `/api/delivery/pedidos/${encodeURIComponent(pedidoId)}/emitir-nota`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({ modelo }),
      }
    )
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      return raw as Record<string, unknown>
    }
    return {}
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
