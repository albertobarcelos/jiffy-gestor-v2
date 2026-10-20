import type { GrupoComplementoLote } from '@/src/application/complementos/menuComplementoLote'
import type { GrupoImpactoLote } from '@/src/application/complementos/impactoComplementoLote'
import type { ComplementoCompleto } from '@/src/domain/complemento/tipos'
import type {
  ImpactoComplementoNoGrupo,
  ResultadoOverridesComplemento,
  VinculoComplementoOverride,
} from '@/src/domain/repositories/IComplementoOverrideRepository'
import {
  buscarGrupoImpactoLoteApi,
  listarGruposComplementoMenuLoteApi,
  reordenarComplementoNoMenuApi,
  reordenarGrupoComplementoNoMenuApi,
} from '@/src/infrastructure/api/complementoConfigApi'
import { criarPropagarAlteracaoComplementoUseCase } from '@/src/presentation/hooks/complementos/criarPropagarAlteracaoComplementoUseCase'
import { useAuthStore } from '@/src/presentation/stores/authStore'

async function tokenOuErro(): Promise<string> {
  const token = useAuthStore.getState().tenantAuth?.getAccessToken()
  if (!token) {
    throw new Error('Token não encontrado. Faça login novamente.')
  }
  return token
}

export async function listarGruposComplementoMenuLote(menuId: string): Promise<GrupoComplementoLote[]> {
  return listarGruposComplementoMenuLoteApi(menuId, await tokenOuErro())
}

export async function buscarGrupoImpactoLote(grupoId: string): Promise<GrupoImpactoLote> {
  return buscarGrupoImpactoLoteApi(grupoId, await tokenOuErro())
}

export async function buscarComplementoCompleto(complementoId: string): Promise<ComplementoCompleto> {
  return criarPropagarAlteracaoComplementoUseCase().buscarCompleto({
    complementoId,
    token: await tokenOuErro(),
  })
}

export async function gravarOverridesComplemento(input: {
  vinculos?: VinculoComplementoOverride[]
  grupos?: ImpactoComplementoNoGrupo[]
}): Promise<ResultadoOverridesComplemento> {
  return criarPropagarAlteracaoComplementoUseCase().aplicarOverrides({
    token: await tokenOuErro(),
    vinculos: input.vinculos,
    grupos: input.grupos,
  })
}

export async function reordenarGrupoComplementoNoMenu(input: {
  menuId: string
  produtoId: string
  grupoComplementoId: string
  novaPosicao: number
}): Promise<void> {
  await reordenarGrupoComplementoNoMenuApi(input, await tokenOuErro())
}

export async function reordenarComplementoNoMenu(input: {
  menuId: string
  produtoId: string
  grupoComplementoId: string
  complementoId: string
  novaPosicao: number
}): Promise<void> {
  await reordenarComplementoNoMenuApi(input, await tokenOuErro())
}
