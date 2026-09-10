'use client'

import { useMemo } from 'react'
import { useAreasEntregaDelivery } from '@/src/presentation/hooks/useAreasEntregaDelivery'
import { useRaiosEntregaDelivery } from '@/src/presentation/hooks/useRaiosEntregaDelivery'
import { useGeoEmpresaEntrega } from '@/src/presentation/hooks/useMoradaTelefone'
import { enderecoTemGeolocalizacao } from '@/src/shared/utils/geolocalizacaoEnderecoShared'
import {
  calcularTaxaCoberturaPonto,
  destinoGeoDaMoradaEndereco,
  type ResultadoTaxaCoberturaPonto,
} from '@/src/shared/utils/calcularTaxaCoberturaPonto'
import type { MoradaTelefone } from '@/src/domain/types/moradaEntrega'

export type CoberturaTaxaPorMoradaMap = Record<string, ResultadoTaxaCoberturaPonto>

export function useCoberturaTaxaPorMoradas(params: {
  enabled: boolean
  moradas: MoradaTelefone[]
}) {
  const areasQuery = useAreasEntregaDelivery({ enabled: params.enabled })
  const raiosQuery = useRaiosEntregaDelivery({ enabled: params.enabled })

  const empresaGeoQuery = useGeoEmpresaEntrega(params.enabled)

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
