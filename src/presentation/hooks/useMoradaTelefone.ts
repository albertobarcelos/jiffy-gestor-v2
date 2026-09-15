'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ClienteDeliveryApi } from '@/src/application/mappers/ClienteDeliveryMoradaMapper'
import { telefoneMinimoDigitosBuscaEntrega } from '@/src/domain/policies/pedido/ClienteEntregaPolicy'
import type {
  AtualizarMoradaTelefoneDTO,
  CriarMoradaTelefoneDTO,
  MoradaTelefone,
} from '@/src/domain/types/moradaEntrega'
import { moradaEntregaRepository } from '@/src/infrastructure/api/repositories/MoradaEntregaRepository'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import { showToast } from '@/src/shared/utils/toast'
import { extrairDigitosTelefone } from '@/src/shared/utils/telefoneBr'

export interface MoradaTelefoneHookOptions {
  usarModuloDelivery?: boolean
}

function moradasTelefoneQueryKey(
  telefone: string | null,
  usarModuloDelivery: boolean,
  empresaId: string | null
) {
  return ['moradas-telefone', empresaId, telefone, usarModuloDelivery ? 'delivery' : 'gestor'] as const
}

export function telefoneProntoParaConsultaDelivery(
  telefone: string | null | undefined,
  usarModuloDelivery: boolean
): boolean {
  if (!telefone?.trim()) return false
  return (
    extrairDigitosTelefone(telefone).length >= telefoneMinimoDigitosBuscaEntrega(usarModuloDelivery)
  )
}

export function useBuscarClienteDeliveryPorTelefone() {
  return useSecureTenantMutation(
    async ({ token }, telefone: string): Promise<ClienteDeliveryApi | null> => {
      return moradaEntregaRepository.buscarClienteDeliveryPorTelefone(telefone, token)
    }
  )
}

export function useCriarClienteDeliveryRapido() {
  return useSecureTenantMutation(
    async (
      { token },
      input: { telefone: string; nome: string }
    ): Promise<ClienteDeliveryApi> => {
      return moradaEntregaRepository.criarClienteDeliveryRapido(input, token)
    }
  )
}

export function useAtualizarNomeClienteDelivery() {
  return useSecureTenantMutation(
    async (
      { token },
      input: { telefone: string; nome: string }
    ): Promise<ClienteDeliveryApi | null> => {
      return moradaEntregaRepository.atualizarNomeClienteDelivery(input, token)
    }
  )
}

export function useGeoEmpresaEntrega(enabled: boolean) {
  return useSecureTenantQuery<{ enderecoLocalizacao: GeoJsonPoint | null }>(
    ['empresa', 'endereco-geo', 'pedido-delivery'],
    async ({ token }) => moradaEntregaRepository.buscarGeoEmpresa(token),
    {
      enabled,
      staleTime: 1000 * 60 * 2,
      refetchOnWindowFocus: false,
    }
  )
}

export function useMoradasPorTelefone(
  telefone: string | null,
  options?: MoradaTelefoneHookOptions
) {
  const { tenantAuth, isAuthenticated, isRehydrated } = useAuthStore()
  const token = tenantAuth?.getAccessToken()
  const empresaId = useTenantEmpresaId()
  const usarModuloDelivery = options?.usarModuloDelivery ?? false

  return useQuery<MoradaTelefone[]>({
    queryKey: moradasTelefoneQueryKey(telefone, usarModuloDelivery, empresaId),
    queryFn: async () => {
      if (!telefone || !token || !empresaId) return []
      return moradaEntregaRepository.listarPorTelefone(telefone, token, usarModuloDelivery)
    },
    enabled:
      telefoneProntoParaConsultaDelivery(telefone, usarModuloDelivery) &&
      isRehydrated &&
      isAuthenticated &&
      !!token &&
      !!empresaId &&
      !tenantAuth?.isExpired(),
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
  })
}

export function useCriarMoradaTelefone(options?: MoradaTelefoneHookOptions) {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()
  const usarModuloDelivery = options?.usarModuloDelivery ?? false

  return useSecureTenantMutation(
    async ({ token }, dto: CriarMoradaTelefoneDTO) => {
      return moradaEntregaRepository.criar(dto, token, usarModuloDelivery)
    },
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: moradasTelefoneQueryKey(variables.telefone, usarModuloDelivery, empresaId),
        })
        showToast.success('Endereço cadastrado com sucesso!')
      },
      onError: (error: Error) => {
        showToast.error(error.message || 'Erro ao cadastrar endereço')
      },
    }
  )
}

export function useAtualizarMoradaTelefone(options?: MoradaTelefoneHookOptions) {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()
  const usarModuloDelivery = options?.usarModuloDelivery ?? false

  return useSecureTenantMutation(
    async ({ token }, { id, dto }: { id: string; dto: AtualizarMoradaTelefoneDTO }) => {
      return moradaEntregaRepository.atualizar(id, dto, token, usarModuloDelivery)
    },
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: moradasTelefoneQueryKey(variables.dto.telefone, usarModuloDelivery, empresaId),
        })
        showToast.success('Endereço atualizado com sucesso!')
      },
      onError: (error: Error) => {
        showToast.error(error.message || 'Erro ao atualizar endereço')
      },
    }
  )
}

export function useExcluirMoradaTelefone(options?: MoradaTelefoneHookOptions) {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()
  const usarModuloDelivery = options?.usarModuloDelivery ?? false

  return useSecureTenantMutation(
    async ({ token }, { id, telefoneDigitos }: { id: string; telefoneDigitos: string }) => {
      return moradaEntregaRepository.excluir(id, telefoneDigitos, token, usarModuloDelivery)
    },
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: moradasTelefoneQueryKey(
            variables.telefoneDigitos,
            usarModuloDelivery,
            empresaId
          ),
        })
        showToast.success('Endereço removido com sucesso!')
      },
      onError: (error: Error) => {
        showToast.error(error.message || 'Erro ao remover endereço')
      },
    }
  )
}

export function useRegistrarUsoMoradaTelefone(options?: MoradaTelefoneHookOptions) {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()
  const usarModuloDelivery = options?.usarModuloDelivery ?? false

  return useSecureTenantMutation(
    async ({ token }, { id, telefoneDigitos }: { id: string; telefoneDigitos: string }) => {
      return moradaEntregaRepository.registrarUso(id, telefoneDigitos, token, usarModuloDelivery)
    },
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: moradasTelefoneQueryKey(
            variables.telefoneDigitos,
            usarModuloDelivery,
            empresaId
          ),
        })
      },
      onError: (error: Error) => {
        showToast.error(error.message || 'Não foi possível atualizar o endereço recente')
      },
    }
  )
}
