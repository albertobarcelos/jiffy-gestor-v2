import type { ICadastroComplemento } from '@/src/application/ports/ICadastroComplemento'
import {
  gestorConfigJson,
  requireGestorConfig,
} from '@/src/infrastructure/api/gestorConfigRequest'

export const cadastroComplementoApi: ICadastroComplemento = {
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
