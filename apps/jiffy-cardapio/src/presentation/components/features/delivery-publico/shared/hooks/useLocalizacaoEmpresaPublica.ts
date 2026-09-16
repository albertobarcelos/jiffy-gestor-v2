'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import { parseGeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import {
  enderecoEmpresaGeocodeMinimo,
  geocodificarEnderecoEmpresaViaGoogle,
  type EnderecoEmpresaGeocodeInput,
} from '@/src/shared/utils/geolocalizacaoEmpresa'

export type EnderecoEmpresaPublicoInput = {
  rua: string
  numero: string
  bairro: string | null
  cidade: string | null
  estado: string | null
  cep: string | null
} | null

function chaveEnderecoEmpresa(input: EnderecoEmpresaGeocodeInput): string {
  return [
    input.rua.trim().toLowerCase(),
    input.numero.trim().toLowerCase(),
    (input.bairro ?? '').trim().toLowerCase(),
    (input.cidade ?? '').trim().toLowerCase(),
    (input.estado ?? '').trim().toUpperCase(),
    (input.cep ?? '').replace(/\D/g, ''),
  ].join('|')
}

function storageKey(slug: string, enderecoKey: string): string {
  return `cardapio-delivery-loja-geo:${slug}:${enderecoKey}`
}

function lerCacheSession(slug: string, enderecoKey: string): GeoJsonPoint | null {
  if (typeof window === 'undefined' || !enderecoKey) return null
  try {
    const raw = sessionStorage.getItem(storageKey(slug, enderecoKey))
    if (!raw) return null
    return parseGeoJsonPoint(JSON.parse(raw))
  } catch {
    return null
  }
}

function salvarCacheSession(slug: string, enderecoKey: string, point: GeoJsonPoint): void {
  if (typeof window === 'undefined' || !enderecoKey) return
  try {
    sessionStorage.setItem(storageKey(slug, enderecoKey), JSON.stringify(point))
  } catch {
    // quota / private mode — ignora
  }
}

function toGeocodeInput(
  endereco: EnderecoEmpresaPublicoInput
): EnderecoEmpresaGeocodeInput | null {
  if (!endereco) return null
  return {
    rua: endereco.rua,
    numero: endereco.numero,
    bairro: endereco.bairro ?? undefined,
    cidade: endereco.cidade ?? undefined,
    estado: endereco.estado ?? undefined,
    cep: endereco.cep ?? undefined,
  }
}

export function publicDeliveryLocalizacaoEmpresaQueryKey(slug: string, enderecoKey: string) {
  return ['public-delivery', slug, 'localizacao-empresa', enderecoKey] as const
}

/**
 * Localização da loja para distância no checkout.
 * Preferência: `localizacao` do catálogo público (P3). Fallback: geocode FE
 * do endereço textual (1 request/sessão + sessionStorage).
 */
export function useLocalizacaoEmpresaPublica(
  slug: string,
  endereco: EnderecoEmpresaPublicoInput,
  enabled = true,
  localizacaoApi?: GeoJsonPoint | null
) {
  const localizacaoDaApi = useMemo(
    () => parseGeoJsonPoint(localizacaoApi),
    [localizacaoApi]
  )

  const input = useMemo(
    () => toGeocodeInput(endereco),
    [
      endereco?.rua,
      endereco?.numero,
      endereco?.bairro,
      endereco?.cidade,
      endereco?.estado,
      endereco?.cep,
    ]
  )
  const podeGeocode = Boolean(input && enderecoEmpresaGeocodeMinimo(input))
  const enderecoKey = input && podeGeocode ? chaveEnderecoEmpresa(input) : ''

  const precisaGeocode = Boolean(
    slug && enabled && !localizacaoDaApi && podeGeocode && enderecoKey
  )

  const query = useQuery({
    queryKey: publicDeliveryLocalizacaoEmpresaQueryKey(slug, enderecoKey),
    queryFn: async ({ signal }) => {
      const cached = lerCacheSession(slug, enderecoKey)
      if (cached) return cached

      const result = await geocodificarEnderecoEmpresaViaGoogle(input!, signal)
      salvarCacheSession(slug, enderecoKey, result.enderecoLocalizacao)
      return result.enderecoLocalizacao
    },
    enabled: precisaGeocode,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  return {
    localizacaoEmpresa: localizacaoDaApi ?? query.data ?? null,
    isLoading: Boolean(precisaGeocode && query.isLoading),
    isError: Boolean(precisaGeocode && query.isError),
    fromApi: Boolean(localizacaoDaApi),
  }
}
