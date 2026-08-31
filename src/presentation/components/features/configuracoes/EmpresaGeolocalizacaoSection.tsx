'use client'

import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import { MdLocationOn, MdMyLocation } from 'react-icons/md'
import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import {
  enderecoEmpresaGeocodeMinimo,
  geocodificarEnderecoEmpresaViaGoogle,
  montarEnderecoParaGeocode,
  type EnderecoEmpresaGeocodeInput,
} from '@/src/shared/utils/geolocalizacaoEmpresa'
import { showToast } from '@/src/shared/utils/toast'

const EmpresaGeolocalizacaoMap = dynamic(
  () =>
    import('./EmpresaGeolocalizacaoMap').then(module => ({
      default: module.EmpresaGeolocalizacaoMap,
    })),
  {
    ssr: false,
    loading: () => <div className="h-[320px] animate-pulse rounded-lg bg-gray-100" aria-hidden />,
  }
)

type EmpresaGeolocalizacaoSectionProps = {
  endereco: EnderecoEmpresaGeocodeInput
  localizacao: GeoJsonPoint | null
  onLocalizacaoChange: (
    point: GeoJsonPoint | null,
    meta?: { providerEnderecoId?: string | null; enderecoFormatado?: string | null }
  ) => void
  disabled?: boolean
  enderecoAlterado?: boolean
}

export function EmpresaGeolocalizacaoSection({
  endereco,
  localizacao,
  onLocalizacaoChange,
  disabled = false,
  enderecoAlterado = false,
}: EmpresaGeolocalizacaoSectionProps) {
  const [buscandoGeocode, setBuscandoGeocode] = useState(false)
  const [ultimoEnderecoFormatado, setUltimoEnderecoFormatado] = useState<string | null>(null)
  const configurada = Boolean(localizacao)
  const enderecoConsulta = useMemo(() => montarEnderecoParaGeocode(endereco), [endereco])
  const camposMinimosOk = enderecoEmpresaGeocodeMinimo(endereco)
  const podeBuscar = camposMinimosOk && !disabled

  const buscarLocalizacaoPeloEndereco = async () => {
    if (disabled) {
      showToast.error('Clique em Editar para buscar e salvar a localização da empresa.')
      return
    }

    if (!camposMinimosOk) {
      showToast.error('Preencha rua, número, cidade e estado antes de buscar no Google.')
      return
    }

    setBuscandoGeocode(true)
    try {
      const resultado = await geocodificarEnderecoEmpresaViaGoogle(endereco)
      onLocalizacaoChange(resultado.enderecoLocalizacao, {
        providerEnderecoId: resultado.providerEnderecoId,
        enderecoFormatado: resultado.enderecoFormatado,
      })
      setUltimoEnderecoFormatado(resultado.enderecoFormatado)
      showToast.success('Localização encontrada. Confira o pin no mapa e clique em Salvar na empresa.')
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro ao buscar localização')
    } finally {
      setBuscandoGeocode(false)
    }
  }

  return (
    <section id="geolocalizacao-empresa" className="scroll-mt-24">
      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-lg font-semibold text-primary">Localização no mapa</h4>
          <p className="text-xs text-secondary-text md:text-sm">
            Obrigatória para publicar o delivery. Usada na loja online e na cobertura de entrega.
          </p>
        </div>
        <span
          className={`inline-flex w-fit items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
            configurada
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-amber-100 text-amber-900'
          }`}
        >
          <MdLocationOn className="h-4 w-4" aria-hidden />
          {configurada ? 'Geolocalização configurada' : 'Geolocalização pendente'}
        </span>
      </div>

      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {disabled ? (
          <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-secondary-text">
            Clique em <span className="font-semibold text-primary-text">Editar</span> para buscar a
            localização pelo endereço cadastrado e salvar as coordenadas.
          </p>
        ) : null}

        {enderecoAlterado ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            O endereço textual foi alterado. Busque novamente no Google ou ajuste o pin antes de salvar.
          </p>
        ) : null}

        <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-secondary-text">
          <p className="font-semibold text-primary-text">Endereço que será enviado ao Google:</p>
          <p className="mt-1 break-words">{enderecoConsulta || 'Preencha rua, número, cidade e estado.'}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void buscarLocalizacaoPeloEndereco()}
            disabled={!podeBuscar || buscandoGeocode}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-secondary px-3 text-sm font-semibold text-secondary transition-colors hover:bg-secondary/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MdMyLocation className="h-4 w-4" aria-hidden />
            {buscandoGeocode ? 'Buscando…' : 'Buscar pelo endereço (Google)'}
          </button>
        </div>

        {ultimoEnderecoFormatado ? (
          <p className="text-xs text-secondary-text">
            Google retornou:{' '}
            <span className="font-medium text-primary-text">{ultimoEnderecoFormatado}</span>
          </p>
        ) : null}

        <p className="text-xs text-secondary-text">
          Depois da busca, clique no mapa ou arraste o pin para ajustar a posição exata da loja.
        </p>

        <EmpresaGeolocalizacaoMap
          value={localizacao}
          onChange={point => onLocalizacaoChange(point)}
          disabled={disabled}
          estado={endereco.estado}
        />
      </div>
    </section>
  )
}
