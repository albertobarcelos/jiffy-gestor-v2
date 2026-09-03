'use client'

import { useCallback, useEffect, useState } from 'react'
import type { EnderecoGeoCheckoutInput } from '@/src/application/dto/delivery-publico/EnderecoGeoCheckoutDTO'
import { EnderecoPlacesAutocomplete } from '@/src/presentation/components/shared/geolocalizacao/EnderecoPlacesAutocomplete'
import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import { formatarCepMascara } from '@/src/shared/utils/consultaCep'
import {
  placeDetailsParaEnderecoGeocode,
  type PlaceDetailsResult,
} from '@/src/shared/utils/geolocalizacaoPlaces'
import { tituloCasePalavrasEndereco } from '@/src/shared/utils/normalizarTextoEnderecoPublico'
import { showToast } from '@/src/shared/utils/toast'

export type MoradaEntregaGeoFormPatch = {
  rua?: string
  numero?: string
  bairro?: string
  cidade?: string
  estado?: string
  cep?: string
}

export type MoradaEntregaGeoInitial = {
  enderecoLocalizacao?: GeoJsonPoint | null
  providerEnderecoId?: string | null
}

type MoradaEntregaGeoPanelProps = {
  sessionKey: string
  initialGeo?: MoradaEntregaGeoInitial | null
  disabled?: boolean
  onFormPatch: (patch: MoradaEntregaGeoFormPatch) => void
  onGeoStateChange?: (state: {
    /** Geo vinda do Places (pronta). Sem Places, o pai geocodifica no salvar. */
    geo: EnderecoGeoCheckoutInput | null
    origem: 'places' | 'salvo' | null
  }) => void
}

function upper(value: string): string {
  return value.toLocaleUpperCase('pt-BR')
}

/**
 * Geo no pedido delivery gestor: só Places autocomplete.
 * Sem mapa, pin, GPS ou preferência de entrega.
 */
export function MoradaEntregaGeoPanel({
  sessionKey,
  initialGeo = null,
  disabled = false,
  onFormPatch,
  onGeoStateChange,
}: MoradaEntregaGeoPanelProps) {
  const [buscaPlaces, setBuscaPlaces] = useState('')
  const [geo, setGeo] = useState<EnderecoGeoCheckoutInput | null>(() =>
    initialGeo?.enderecoLocalizacao
      ? {
          enderecoLocalizacao: initialGeo.enderecoLocalizacao,
          providerEnderecoId: initialGeo.providerEnderecoId ?? null,
        }
      : null
  )
  const [origem, setOrigem] = useState<'places' | 'salvo' | null>(() =>
    initialGeo?.enderecoLocalizacao ? 'salvo' : null
  )

  useEffect(() => {
    const inicial = initialGeo?.enderecoLocalizacao
      ? {
          enderecoLocalizacao: initialGeo.enderecoLocalizacao,
          providerEnderecoId: initialGeo.providerEnderecoId ?? null,
        }
      : null
    setBuscaPlaces('')
    setGeo(inicial)
    setOrigem(inicial ? 'salvo' : null)
    onGeoStateChange?.({ geo: inicial, origem: inicial ? 'salvo' : null })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset por sessão
  }, [sessionKey])

  const aplicarPlaceDetails = useCallback(
    (place: PlaceDetailsResult) => {
      const fields = placeDetailsParaEnderecoGeocode(place)
      onFormPatch({
        ...(fields.rua ? { rua: upper(fields.rua) } : {}),
        ...(fields.numero ? { numero: fields.numero } : {}),
        ...(fields.bairro ? { bairro: upper(fields.bairro) } : {}),
        ...(fields.cidade ? { cidade: upper(fields.cidade) } : {}),
        ...(fields.estado ? { estado: fields.estado.toUpperCase().slice(0, 2) } : {}),
        ...(fields.cep ? { cep: formatarCepMascara(fields.cep) } : {}),
      })
      const next: EnderecoGeoCheckoutInput = {
        enderecoLocalizacao: place.enderecoLocalizacao,
        providerEnderecoId: place.providerEnderecoId,
      }
      setGeo(next)
      setOrigem('places')
      onGeoStateChange?.({ geo: next, origem: 'places' })
      setBuscaPlaces(
        tituloCasePalavrasEndereco(
          [fields.rua, fields.numero].filter(Boolean).join(', ') ||
            place.enderecoFormatado ||
            ''
        )
      )
      showToast.success('Endereço e localização aplicados pelo Google.')
    },
    [onFormPatch, onGeoStateChange]
  )

  return (
    <div className="space-y-2">
      <EnderecoPlacesAutocomplete
        variant="gestor"
        floatingLabel={false}
        label="Buscar endereço no Google"
        placeholder="Digite rua, bairro ou cidade…"
        value={buscaPlaces}
        onChange={setBuscaPlaces}
        onSelect={aplicarPlaceDetails}
        onClear={() => {
          setBuscaPlaces('')
          setGeo(null)
          setOrigem(null)
          onGeoStateChange?.({ geo: null, origem: null })
        }}
        disabled={disabled}
      />
      {geo ? (
        <p className="text-xs text-emerald-700">
          {origem === 'places'
            ? 'Localização definida pela sugestão do Google.'
            : 'Localização já salva neste endereço.'}
        </p>
      ) : (
        <p className="text-xs text-gray-500">
          Selecione uma sugestão do Google ou preencha o formulário abaixo. Ao salvar, buscamos a
          coordenada automaticamente (sem mapa).
        </p>
      )}
    </div>
  )
}
