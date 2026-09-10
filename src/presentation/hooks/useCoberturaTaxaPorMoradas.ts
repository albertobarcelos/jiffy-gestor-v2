'use client'

import { useMemo } from 'react'
import { useAreasEntregaDelivery } from '@/src/presentation/hooks/useAreasEntregaDelivery'
import { useRaiosEntregaDelivery } from '@/src/presentation/hooks/useRaiosEntregaDelivery'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { lerEnderecoLocalizacaoDoPayloadEmpresa } from '@/src/shared/utils/geolocalizacaoEmpresa'
import { enderecoTemGeolocalizacao } from '@/src/shared/utils/geolocalizacaoEnderecoShared'
import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import {
  calcularTaxaCoberturaPonto,
  destinoGeoDaMoradaEndereco,
  type ResultadoTaxaCoberturaPonto,
} from '@/src/shared/utils/calcularTaxaCoberturaPonto'
import type { MoradaTelefone } from '@/src/presentation/hooks/useMoradaTelefone'

export type CoberturaTaxaPorMoradaMap = Record<string, ResultadoTaxaCoberturaPonto>

export function useCoberturaTaxaPorMoradas(params: {
  enabled: boolean
  moradas: MoradaTelefone[]
}) {
  const areasQuery = useAreasEntregaDelivery({ enabled: params.enabled })
  const raiosQuery = useRaiosEntregaDelivery({ enabled: params.enabled })

  const empresaGeoQuery = useSecureTenantQuery<{ enderecoLocalizacao: GeoJsonPoint | null }>(
    ['empresa', 'endereco-geo', 'pedido-delivery'],
    async ({ token }) => {
      const res = await fetchGestorApi('/api/empresas/me', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(typeof body.error === 'string' ? body.error : `Erro ${res.status}`)
      }
      const data = await res.json()
      const endereco =
        data.endereco && typeof data.endereco === 'object' && !Array.isArray(data.endereco)
          ? data.endereco
          : null
      return lerEnderecoLocalizacaoDoPayloadEmpresa(endereco)
    },
    {
      enabled: params.enabled,
      staleTime: 1000 * 60 * 2,
      refetchOnWindowFocus: false,
    }
  )

  const isLoading =
    params.enabled &&
    (areasQuery.isLoading || raiosQuery.isLoading || empresaGeoQuery.isLoading)

  const isError =
    params.enabled &&
    (areasQuery.isError || raiosQuery.isError || empresaGeoQuery.isError)

  const porMoradaId = useMemo((): CoberturaTaxaPorMoradaMap => {
    if (!params.enabled) return {}

    const areas = areasQuery.data ?? []
    const raios = raiosQuery.data ?? []
    const origemEmpresa = empresaGeoQuery.data?.enderecoLocalizacao ?? null

    // Só calcula quando as queries já resolveram (evita “fora” falso enquanto carrega).
    if (areasQuery.isLoading || raiosQuery.isLoading || empresaGeoQuery.isLoading) {
      return {}
    }

    const map: CoberturaTaxaPorMoradaMap = {}
    for (const morada of params.moradas) {
      const endereco = morada.endereco
      if (!endereco || !enderecoTemGeolocalizacao(endereco)) continue
      const destino = destinoGeoDaMoradaEndereco(endereco)
      if (!destino) continue
      map[morada.id] = calcularTaxaCoberturaPonto({
        destino,
        origemEmpresa,
        areas,
        raios,
      })
    }
    return map
  }, [
    params.enabled,
    params.moradas,
    areasQuery.data,
    areasQuery.isLoading,
    raiosQuery.data,
    raiosQuery.isLoading,
    empresaGeoQuery.data,
    empresaGeoQuery.isLoading,
  ])

  return {
    porMoradaId,
    isLoading,
    isError,
    isReady: params.enabled && !isLoading && !isError,
  }
}
