import type { IPropagacaoComplemento } from '@/src/application/ports/IPropagacaoComplemento'
import {
  gestorConfigJson,
  requireGestorConfig,
} from '@/src/infrastructure/api/gestorConfigRequest'
import { mapComplementoCompletoFromApi } from '@/src/infrastructure/database/repositories/mapComplementoCompletoFromApi'

export const propagacaoComplementoApi: IPropagacaoComplemento = {
  async buscarCompleto(complementoId, token) {
    const res = await gestorConfigJson(
      `/api/complementos/${encodeURIComponent(complementoId)}?retorno=completo`,
      token
    )
    const data = requireGestorConfig(res)
    const completo = mapComplementoCompletoFromApi(data)
    if (!completo) {
      throw new Error('Complemento não encontrado')
    }
    return completo
  },

  async gravarVinculos(vinculos, token) {
    requireGestorConfig(
      await gestorConfigJson('/api/complementos/overrides', token, {
        method: 'PATCH',
        json: { vinculos },
      })
    )
  },
}
