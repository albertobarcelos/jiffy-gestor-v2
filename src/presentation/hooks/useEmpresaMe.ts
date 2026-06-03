'use client'

import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { useTenantEmpresaId, useTenantQueryKey } from '@/src/presentation/hooks/useTenantQueryKey'
import { resolverTimezoneAgregacaoEmpresa } from '@/src/shared/utils/timezoneAgregacaoEmpresa'
import type { PreferenciasImpressaoDelivery } from '@/src/shared/types/deliveryImpressao'
import { DEFAULT_PREFERENCIAS_IMPRESSAO_DELIVERY } from '@/src/shared/types/deliveryImpressao'
import { parsePreferenciasImpressaoDelivery } from '@/src/shared/utils/parsePreferenciasImpressaoDelivery'
import {
  DEFAULT_DELIVERY_CUPOM_TEMPLATE,
  type DeliveryCupomTemplateConfig,
} from '@/src/shared/types/deliveryCupomTemplate'
import { parseDeliveryCupomTemplate } from '@/src/shared/utils/parseDeliveryCupomTemplate'
import { getDeliveryCupomTemplateLocal } from '@/src/infrastructure/printing/deliveryCupomTemplateStorage'

/** Endereço da empresa (GET `/api/empresas/me`) — usado em mensagens de retirada. */
export interface EnderecoEmpresaMe {
  rua?: string | null
  numero?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
  cep?: string | null
  complemento?: string | null
}

/** Resumo da empresa da sessão (mesma rota usada em configurações / painel contador) */
export interface EmpresaMeResumo {
  id: string
  nomeExibicao: string
  cidade?: string
  estado?: string
  endereco?: EnderecoEmpresaMe | null
}

export interface EmpresaMeQueryData {
  empresa: EmpresaMeResumo
  timezoneAgregacao: string
  preferenciasImpressaoDelivery: PreferenciasImpressaoDelivery
  deliveryCupomTemplate: DeliveryCupomTemplateConfig
}

function mapEnderecoEmpresaMe(enderecoRaw: Record<string, unknown>): EnderecoEmpresaMe | null {
  const pick = (key: string) => {
    const v = enderecoRaw[key]
    return v != null && String(v).trim() !== '' ? String(v).trim() : null
  }
  const rua = pick('rua') ?? pick('logradouro')
  const mapped: EnderecoEmpresaMe = {
    rua,
    numero: pick('numero'),
    bairro: pick('bairro'),
    cidade: pick('cidade'),
    estado: (pick('estado') ?? pick('uf'))?.toUpperCase().slice(0, 2) ?? null,
    cep: pick('cep'),
    complemento: pick('complemento'),
  }
  const hasAny = Object.values(mapped).some(v => v != null && v !== '')
  return hasAny ? mapped : null
}

export async function fetchEmpresaMeQueryData(token: string): Promise<EmpresaMeQueryData> {
  const res = await fetchGestorApi('/api/empresas/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(typeof body.error === 'string' ? body.error : `Erro ${res.status}`)
  }

  const data: Record<string, unknown> = await res.json()
  const id = data.id != null ? String(data.id) : ''
  if (!id) {
    throw new Error('Resposta sem id da empresa')
  }

  const candidatos = [data.nomeFantasia, data.razaoSocial, data.nome]
  const nomeBruto = candidatos.find(
    (v): v is string => typeof v === 'string' && v.trim().length > 0
  )
  const nomeExibicao = nomeBruto?.trim() ?? 'Empresa'
  const endereco =
    data.endereco && typeof data.endereco === 'object' && !Array.isArray(data.endereco)
      ? (data.endereco as Record<string, unknown>)
      : {}
  const cidade =
    typeof endereco.cidade === 'string' && endereco.cidade.trim()
      ? endereco.cidade.trim()
      : undefined
  const estadoRaw = endereco.estado ?? endereco.uf
  const estado =
    typeof estadoRaw === 'string' && estadoRaw.trim()
      ? estadoRaw.trim().toUpperCase().slice(0, 2)
      : undefined

  const timezoneAgregacao = resolverTimezoneAgregacaoEmpresa(data)
  if (process.env.NODE_ENV === 'development') {
    console.log('[useEmpresaMe] GET /api/empresas/me — timezone agregação:', {
      parametroEmpresa: data.parametroEmpresa,
      timezoneResolvido: timezoneAgregacao,
    })
  }

  return {
    empresa: {
      id,
      nomeExibicao,
      cidade,
      estado,
      endereco: mapEnderecoEmpresaMe(endereco),
    },
    timezoneAgregacao,
    preferenciasImpressaoDelivery: parsePreferenciasImpressaoDelivery(data),
    deliveryCupomTemplate: getDeliveryCupomTemplateLocal(id) ?? parseDeliveryCupomTemplate(data),
  }
}

/**
 * Carrega a empresa vinculada ao token em uma única chamada: `GET /api/empresas/me`.
 * Cache compartilhado via React Query — múltiplos componentes reutilizam a mesma resposta.
 */
export function useEmpresaMe() {
  const { auth, isAuthenticated, isRehydrated } = useAuthStore()
  const empresaId = useTenantEmpresaId()
  const queryClient = useQueryClient()
  const queryKey = useTenantQueryKey(['empresas', 'me'])

  const token = auth?.getAccessToken()
  const enabled = isRehydrated && isAuthenticated && !!token

  const query = useQuery({
    queryKey,
    queryFn: () => fetchEmpresaMeQueryData(token!),
    enabled,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    retry: 1,
  })

  useEffect(() => {
    const onUpdated = () => {
      void queryClient.invalidateQueries({ queryKey: ['tenant', empresaId, 'empresas', 'me'] })
    }
    window.addEventListener('jiffy:empresa-me-updated', onUpdated)
    return () => window.removeEventListener('jiffy:empresa-me-updated', onUpdated)
  }, [queryClient, empresaId])

  const data = query.data

  return {
    empresa: data?.empresa ?? null,
    timezoneAgregacao: data?.timezoneAgregacao ?? 'America/Sao_Paulo',
    preferenciasImpressaoDelivery:
      data?.preferenciasImpressaoDelivery ?? DEFAULT_PREFERENCIAS_IMPRESSAO_DELIVERY,
    deliveryCupomTemplate: data?.deliveryCupomTemplate ?? DEFAULT_DELIVERY_CUPOM_TEMPLATE,
    isLoading: enabled && query.isPending,
    error:
      query.error instanceof Error
        ? query.error.message
        : query.error
          ? String(query.error)
          : null,
    refetch: () => void query.refetch(),
  }
}
