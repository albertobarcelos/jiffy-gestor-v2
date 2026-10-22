import type { IPropagacaoComplemento } from '@/src/application/ports/IPropagacaoComplemento'
import type {
  ImpactoComplementoNoGrupo,
  ResultadoOverridesComplemento,
  VinculoComplementoOverride,
} from '@/src/domain/repositories/IComplementoOverrideRepository'
import {
  gestorConfigJson,
  requireGestorConfig,
} from '@/src/infrastructure/api/gestorConfigRequest'
import { mapComplementoCompletoFromApi } from '@/src/infrastructure/database/repositories/mapComplementoCompletoFromApi'

async function patchOverrides(
  input: {
    vinculos?: VinculoComplementoOverride[]
    grupos?: ImpactoComplementoNoGrupo[]
  },
  token: string
): Promise<ResultadoOverridesComplemento> {
  const data = requireGestorConfig<{ message?: string; atualizados?: number }>(
    await gestorConfigJson('/api/complementos/overrides', token, {
      method: 'PATCH',
      json: input,
    })
  )
  return {
    message: data.message || 'Configurações atualizadas com sucesso',
    atualizados: typeof data.atualizados === 'number' ? data.atualizados : 0,
  }
}

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

  gravarOverrides: patchOverrides,
}
