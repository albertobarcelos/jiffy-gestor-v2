import type { ICadastroComplemento } from '@/src/application/ports/ICadastroComplemento'
import {
  gestorConfigJson,
  requireGestorConfig,
} from '@/src/infrastructure/api/gestorConfigRequest'

export const cadastroComplementoApi: ICadastroComplemento = {
  async listar(filtro, token) {
    const search = new URLSearchParams()
    if (filtro.q) search.append('q', filtro.q)
    if (filtro.ativo !== undefined && filtro.ativo !== null) {
      search.append('ativo', String(filtro.ativo))
    }
    search.append('limit', String(filtro.limit))
    search.append('offset', String(filtro.offset))
    const data = requireGestorConfig<{ items?: unknown[]; count?: number }>(
      await gestorConfigJson(`/api/complementos?${search.toString()}`, token)
    )
    return {
      items: Array.isArray(data.items) ? data.items : [],
      count: typeof data.count === 'number' ? data.count : 0,
    }
  },

  async buscar(id, token) {
    return requireGestorConfig(
      await gestorConfigJson(`/api/complementos/${encodeURIComponent(id)}`, token)
    )
  },

  async criar(dados, token) {
    return requireGestorConfig(
      await gestorConfigJson('/api/complementos', token, {
        method: 'POST',
        json: dados,
      })
    )
  },

  async atualizar(id, dados, token) {
    return requireGestorConfig(
      await gestorConfigJson(`/api/complementos/${encodeURIComponent(id)}`, token, {
        method: 'PATCH',
        json: dados,
      })
    )
  },
}
