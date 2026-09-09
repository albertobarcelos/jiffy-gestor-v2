'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  MdDeleteOutline,
  MdMap,
  MdMyLocation,
  MdWarning,
} from 'react-icons/md'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/presentation/components/ui/dialog'
import {
  dispararEmpresaDeliveryAtualizada,
  EMPRESA_DELIVERY_ME_QUERY_KEY,
  useEmpresaDeliveryMe,
} from '@/src/presentation/hooks/useEmpresaDeliveryMe'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useAtualizarRaioEntregaDelivery, useAtualizarRaiosEntregaEmLote, useCriarRaiosEntregaEmLote, useExcluirRaiosEntregaEmLote, useRaiosEntregaDelivery } from '@/src/presentation/hooks/useRaiosEntregaDelivery'
import {
  useAreasEntregaDelivery,
  useAtualizarAreaEntregaDelivery,
  useAtualizarAreasEntregaEmLote,
  useCriarAreaEntregaDelivery,
  useExcluirAreaEntregaDelivery,
} from '@/src/presentation/hooks/useAreasEntregaDelivery'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { showToast } from '@/src/shared/utils/toast'
import { DELIVERY_HUB_PATH, configuracoesTabPath } from '@/src/shared/constants/configuracoesRoutes'
import {
  isFalhaServicoMapaGoogle,
  MENSAGEM_MAPA_INDISPONIVEL_SUPORTE,
} from '@/src/shared/utils/googleMapsFalha'
import {
  avisarMapaIndisponivelCliente,
  mapaGoogleAuthFalhou,
  onMapaGoogleAuthFailure,
} from '@/src/shared/utils/googleMapsFalhaCliente'
import {
  enderecoEmpresaGeocodeMinimo,
  geocodificarEnderecoEmpresaViaGoogle,
  lerCamposEnderecoEmpresa,
  lerEnderecoLocalizacaoDoPayloadEmpresa,
  montarPatchEnderecoGeolocalizacao,
} from '@/src/shared/utils/geolocalizacaoEmpresa'
import type {
  EnderecoEmpresaGeocodeInput,
  GeocodeEmpresaResult,
} from '@/src/shared/utils/geolocalizacaoEmpresa'
import { pontosGeoIguais, type GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import {
  latLngPathsToGeoJsonPolygon,
  type GeoJsonPolygon,
  type LatLngLiteral,
} from '@/src/shared/types/geoJsonPolygon'
import { geoJsonPolygonDeCirculo } from '@/src/shared/utils/geoJsonCircle'
import {
  parseAlcanceKmInteiro,
  sincronizarFaixasAlcanceKm,
} from '@/src/shared/utils/alcanceCoberturaKm'
import {
  limitarPontoAoRaio,
  pinDentroDoRaioPermitido,
  RAIO_AJUSTE_PIN_METROS,
} from '@/src/shared/utils/ajustePinEmpresa'
import type {
  AcoesDesenhoCobertura,
  EstadoDesenhoCobertura,
  FerramentaCobertura,
} from '@/src/presentation/components/features/configuracoes/CoberturaDeliveryMap'
import {
  resolverDestaqueCobertura,
  raioAlcanceMaximo,
  type DestaqueCobertura,
} from '@/src/shared/utils/coberturaMapaDestaque'
import {
  DISTANCIA_MAXIMA_KM_RAIO,
  formatAlcanceAteKm,
  kmParaMetrosRaio,
  metrosParaKmRaio,
  type RaioEntregaDTO,
  type AreaEntregaDTO,
} from '@/src/application/dto/delivery/CoberturaEntregaDTO'
import { temCoberturaEntregaAtiva } from '@/src/application/mappers/CoberturaEntregaMapper'
import {
  COBERTURA_PAINEL_ABAS,
  ativoCoberturaPendente,
  camadasMapaCobertura,
  linhaTaxaPrazoPendente,
  mensagemFalhaLoteCobertura,
  parsePrazoDraftCobertura,
  parseTaxaDraftCobertura,
  type CoberturaPainelAba,
} from '@/src/presentation/components/features/configuracoes/coberturaPainelAbas'
import { useReportarCoberturaSuja } from '@/src/presentation/components/features/configuracoes/coberturaSairGuard'

const NENHUM_RAIO: RaioEntregaDTO[] = []
const NENHUMA_AREA: AreaEntregaDTO[] = []

const CoberturaDeliveryMap = dynamic(
  () =>
    import('@/src/presentation/components/features/configuracoes/CoberturaDeliveryMap').then(
      module => ({ default: module.CoberturaDeliveryMap })
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-full min-h-[280px] animate-pulse rounded-lg bg-gray-100" aria-hidden />
    ),
  }
)

const TEMPO_PADRAO_FAIXA_KM = 45
const ALCANCE_INICIAL_KM = 4
const CAMPOS_ENDERECO_PIN = [
  'cep',
  'rua',
  'numero',
  'complemento',
  'bairro',
  'cidade',
  'estado',
  'codigoCidadeIbge',
] as const

function mensagemErroArea(error: unknown): string {
  const msg = error instanceof Error ? error.message : 'Não foi possível salvar a área.'
  if (/sobrepos|overlap|intersect/i.test(msg)) {
    return 'Esta área sobrepõe outra já cadastrada. Ajuste o desenho e tente novamente.'
  }
  return msg
}

function CampoTaxaInline({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <div className="flex min-w-0 items-center rounded-md border border-gray-200 bg-white">
      <span className="pl-1.5 text-[10px] text-secondary-text">R$</span>
      <input
        type="text"
        inputMode="decimal"
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={event => onChange(event.target.value)}
        onFocus={event => event.currentTarget.select()}
        onMouseUp={event => event.preventDefault()}
        className="w-full min-w-0 bg-transparent px-1 py-1 text-sm text-primary-text outline-none disabled:opacity-50"
      />
    </div>
  )
}

function CampoPrazoInline({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <div className="flex min-w-0 items-center rounded-md border border-gray-200 bg-white">
      <input
        type="text"
        inputMode="numeric"
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={event => onChange(event.target.value)}
        onFocus={event => event.currentTarget.select()}
        onMouseUp={event => event.preventDefault()}
        className="w-full min-w-0 bg-transparent px-1 py-1 text-center text-sm text-primary-text outline-none disabled:opacity-50"
      />
      <span className="pr-1.5 text-[10px] text-secondary-text">min</span>
    </div>
  )
}

function BotaoSalvarTaxasLote({
  pendente,
  disabled,
  salvando,
  onClick,
}: {
  pendente: boolean
  disabled: boolean
  salvando: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-lg px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed ${
        pendente
          ? 'bg-primary text-white hover:bg-primary/90 disabled:opacity-50'
          : 'bg-gray-200 text-gray-600'
      }`}
    >
      {salvando ? 'Salvando…' : pendente ? 'Salvar' : 'Tudo certo'}
    </button>
  )
}

function NomeAreaInline({
  area,
  salvando,
  onSalvar,
}: {
  area: AreaEntregaDTO
  salvando: boolean
  onSalvar: (nome: string) => Promise<void>
}) {
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState(area.nome ?? '')

  useEffect(() => {
    if (!editando) setTexto(area.nome ?? '')
  }, [area.nome, editando])

  const confirmar = async () => {
    const nome = texto.trim()
    if (!nome || nome === (area.nome ?? '').trim()) {
      setEditando(false)
      setTexto(area.nome ?? '')
      return
    }
    await onSalvar(nome)
    setEditando(false)
  }

  if (!editando) {
    return (
      <button
        type="button"
        onClick={() => setEditando(true)}
        disabled={salvando}
        title="Clique para editar o nome"
        className="truncate text-left text-xs font-medium text-primary-text hover:underline disabled:opacity-50"
      >
        {area.nome?.trim() || 'Clique para nomear'}
      </button>
    )
  }

  return (
    <input
      autoFocus
      aria-label="Nome da área"
      value={texto}
      disabled={salvando}
      onChange={event => setTexto(event.target.value)}
      onBlur={() => void confirmar()}
      onKeyDown={event => {
        if (event.key === 'Enter') {
          event.preventDefault()
          event.currentTarget.blur()
        }
        if (event.key === 'Escape') {
          setEditando(false)
          setTexto(area.nome ?? '')
        }
      }}
      className="w-full min-w-0 rounded-md border border-gray-200 bg-white px-1 py-0.5 text-xs text-primary-text outline-none focus:border-primary"
    />
  )
}

export function CoberturaDeliveryTab() {
  const empresaDeliveryQuery = useEmpresaDeliveryMe()
  const raiosQuery = useRaiosEntregaDelivery({
    enabled: empresaDeliveryQuery.isSuccess && empresaDeliveryQuery.data != null,
  })
  const areasQuery = useAreasEntregaDelivery({
    enabled: empresaDeliveryQuery.isSuccess && empresaDeliveryQuery.data != null,
  })
  const criarRaiosLoteMutation = useCriarRaiosEntregaEmLote()
  const atualizarRaioMutation = useAtualizarRaioEntregaDelivery()
  const atualizarRaiosLoteMutation = useAtualizarRaiosEntregaEmLote()
  const excluirRaiosLoteMutation = useExcluirRaiosEntregaEmLote()
  const criarAreaMutation = useCriarAreaEntregaDelivery()
  const atualizarAreaMutation = useAtualizarAreaEntregaDelivery()
  const atualizarAreasLoteMutation = useAtualizarAreasEntregaEmLote()
  const excluirAreaMutation = useExcluirAreaEntregaDelivery()

  const geoQuery = useSecureTenantQuery<{
    enderecoLocalizacao: GeoJsonPoint | null
    providerEnderecoId: string | null
    endereco: EnderecoEmpresaGeocodeInput
  }>(
    ['empresa', 'endereco-geo'],
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
      const loc = lerEnderecoLocalizacaoDoPayloadEmpresa(endereco)
      return {
        ...loc,
        endereco: lerCamposEnderecoEmpresa(endereco),
      }
    },
    { staleTime: 1000 * 60 * 2, refetchOnWindowFocus: false }
  )

  const [areaExcluindo, setAreaExcluindo] = useState<AreaEntregaDTO | null>(null)
  const [ferramenta, setFerramenta] = useState<FerramentaCobertura>('navegar')
  const [geometriaRascunho, setGeometriaRascunho] = useState<GeoJsonPolygon | null>(null)
  const [rascunhoPaths, setRascunhoPaths] = useState<LatLngLiteral[] | null>(null)
  const [mapaVisivel, setMapaVisivel] = useState(true)
  const [painelAba, setPainelAba] = useState<CoberturaPainelAba>('raios')
  const [areaFormaEditandoId, setAreaFormaEditandoId] = useState<string | null>(null)
  const [formaPathsRascunho, setFormaPathsRascunho] = useState<LatLngLiteral[] | null>(null)
  const [formaAlterada, setFormaAlterada] = useState(false)
  const [hoverCobertura, setHoverCobertura] = useState<DestaqueCobertura | null>(null)
  const [pontosDesenho, setPontosDesenho] = useState(0)
  const [podeConcluirDesenho, setPodeConcluirDesenho] = useState(false)
  const [taxasDraft, setTaxasDraft] = useState<Record<string, string>>({})
  const [prazosDraft, setPrazosDraft] = useState<Record<string, string>>({})
  const [ativosDraft, setAtivosDraft] = useState<Record<string, boolean>>({})
  const [taxasAreaDraft, setTaxasAreaDraft] = useState<Record<string, string>>({})
  const [prazosAreaDraft, setPrazosAreaDraft] = useState<Record<string, string>>({})
  const [ativosAreaDraft, setAtivosAreaDraft] = useState<Record<string, boolean>>({})
  const [alcanceKmTexto, setAlcanceKmTexto] = useState('')
  const [definindoAlcance, setDefinindoAlcance] = useState(false)
  const [confirmandoSetup, setConfirmandoSetup] = useState(false)
  const [pinRascunho, setPinRascunho] = useState<GeoJsonPoint | null>(null)
  const [pinSnapEpoch, setPinSnapEpoch] = useState(0)
  const [centroEnderecoGeo, setCentroEnderecoGeo] = useState<GeoJsonPoint | null>(null)
  const geocodeResultadoRef = useRef<GeocodeEmpresaResult | null>(null)
  const geocodeAssinaturaRef = useRef('')
  const [mapaIndisponivel, setMapaIndisponivel] = useState(mapaGoogleAuthFalhou)
  const acoesDesenhoRef = useRef<AcoesDesenhoCobertura | null>(null)
  const invalidateQueries = useInvalidateTenantQueries()

  const atualizarOrigemMutation = useSecureTenantMutation<
    void,
    { point: GeoJsonPoint; providerEnderecoId?: string | null }
  >(
    async ({ token }, { point, providerEnderecoId }) => {
      const getRes = await fetchGestorApi('/api/empresas/me', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (!getRes.ok) throw new Error('Não foi possível ler o endereço da empresa.')
      const data: unknown = await getRes.json()
      const payload = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
      const empresaId = payload.id != null ? String(payload.id) : ''
      if (!empresaId) throw new Error('Não foi possível identificar a empresa.')
      const atual =
        payload.endereco && typeof payload.endereco === 'object' && !Array.isArray(payload.endereco)
          ? (payload.endereco as Record<string, unknown>)
          : {}
      const endereco: Record<string, unknown> = {}
      for (const campo of CAMPOS_ENDERECO_PIN) {
        const valor = atual[campo]
        if (valor != null && valor !== '') endereco[campo] = valor
      }
      Object.assign(endereco, montarPatchEnderecoGeolocalizacao(point, providerEnderecoId) ?? {})
      const res = await fetchGestorApi(`/api/empresas/${encodeURIComponent(empresaId)}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ endereco }),
      })
      if (!res.ok) {
        const body: unknown = await res.json().catch(() => ({}))
        const erro =
          body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
            ? body.error
            : 'Não foi possível atualizar o pin da loja.'
        throw new Error(erro)
      }
    },
    {
      onSuccess: async () => {
        await invalidateQueries(['empresa', 'endereco-geo'])
        await invalidateQueries(EMPRESA_DELIVERY_ME_QUERY_KEY)
        dispararEmpresaDeliveryAtualizada()
      },
    }
  )

  const empresaDelivery = empresaDeliveryQuery.data
  const raios = raiosQuery.data ?? []
  const areas = areasQuery.data ?? []
  const raiosComDraft = useMemo(
    () => raios.map(raio => ({ ...raio, ativo: ativosDraft[raio.id] ?? raio.ativo })),
    [ativosDraft, raios]
  )
  const areasComDraft = useMemo(
    () => areas.map(area => ({ ...area, ativo: ativosAreaDraft[area.id] ?? area.ativo })),
    [areas, ativosAreaDraft]
  )
  const camadasMapa = camadasMapaCobertura(painelAba)
  const raiosNoMapa = camadasMapa.raios ? raiosComDraft : NENHUM_RAIO
  const areasNoMapa = camadasMapa.areas ? areasComDraft : NENHUMA_AREA
  const origemGeo = geoQuery.data?.enderecoLocalizacao ?? null
  const enderecoEmpresa = geoQuery.data?.endereco
  const geoConfigurada = origemGeo != null
  const pinPendente = Boolean(pinRascunho && !pontosGeoIguais(pinRascunho, origemGeo))
  const salvandoPin = atualizarOrigemMutation.isPending && !confirmandoSetup
  const pinParaConfirmar = pinRascunho ?? centroEnderecoGeo ?? origemGeo
  const centroAjustePin = centroEnderecoGeo ?? origemGeo
  const pinSalvoForaDoRaio = Boolean(
    centroEnderecoGeo &&
      origemGeo &&
      !pinDentroDoRaioPermitido(centroEnderecoGeo, origemGeo)
  )
  const enderecoPreenchido = enderecoEmpresaGeocodeMinimo(
    enderecoEmpresa ?? { rua: '', numero: '' }
  )
  const enderecoAssinatura = [
    enderecoEmpresa?.rua,
    enderecoEmpresa?.numero,
    enderecoEmpresa?.bairro,
    enderecoEmpresa?.cidade,
    enderecoEmpresa?.estado,
    enderecoEmpresa?.cep,
  ]
    .map(v => (v ?? '').trim().toLowerCase())
    .join('|')
  const raioAlcance = useMemo(() => raioAlcanceMaximo(raios), [raios])
  const alcanceKm = raioAlcance
    ? Math.max(1, Math.round(metrosParaKmRaio(raioAlcance.distanciaMaximaEmMetros) * 100) / 100)
    : 0
  const raiosOrdenados = useMemo(
    () => [...raios].sort((a, b) => a.distanciaMaximaEmMetros - b.distanciaMaximaEmMetros),
    [raios]
  )
  const temCoberturaAtiva = temCoberturaEntregaAtiva(raios, areas)
  const setupInicial = Boolean(
    empresaDelivery &&
      !mapaIndisponivel &&
      enderecoPreenchido &&
      pinParaConfirmar &&
      (!geoConfigurada || !temCoberturaAtiva)
  )
  const areaFormaEditando = useMemo(
    () => areas.find(a => a.id === areaFormaEditandoId) ?? null,
    [areas, areaFormaEditandoId]
  )
  const destaqueMapa = useMemo(
    () =>
      resolverDestaqueCobertura({
        hover: hoverCobertura,
        areaFormaEditandoId,
        areaEditandoId: null,
      }),
    [hoverCobertura, areaFormaEditandoId]
  )

  const destacarNaLista = useCallback(
    (destaque: DestaqueCobertura | null) => {
      setHoverCobertura(destaque)
      if (destaque && geoConfigurada) setMapaVisivel(true)
    },
    [geoConfigurada]
  )
  const salvando =
    criarRaiosLoteMutation.isPending ||
    atualizarRaioMutation.isPending ||
    atualizarRaiosLoteMutation.isPending ||
    criarAreaMutation.isPending ||
    atualizarAreaMutation.isPending ||
    atualizarAreasLoteMutation.isPending ||
    excluirAreaMutation.isPending ||
    excluirRaiosLoteMutation.isPending ||
    atualizarOrigemMutation.isPending ||
    confirmandoSetup

  const raiosTaxaSignature = raiosOrdenados
    .map(raio => `${raio.id}:${raio.valorTaxa}:${raio.tempoEntregaInMinutes}:${raio.ativo ? 1 : 0}`)
    .join('|')
  useEffect(() => {
    setTaxasDraft(
      Object.fromEntries(
        raiosOrdenados.map(raio => [raio.id, String(raio.valorTaxa).replace('.', ',')])
      )
    )
    setPrazosDraft(
      Object.fromEntries(
        raiosOrdenados.map(raio => [raio.id, String(raio.tempoEntregaInMinutes)])
      )
    )
    setAtivosDraft(Object.fromEntries(raiosOrdenados.map(raio => [raio.id, raio.ativo])))
    // Só ressincroniza quando id/valor/prazo/ativo da API muda — não enquanto o operador edita.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raiosTaxaSignature])

  const areasTaxaSignature = areas
    .map(area => `${area.id}:${area.valorTaxa}:${area.tempoEntregaInMinutes}:${area.ativo ? 1 : 0}`)
    .join('|')
  useEffect(() => {
    setTaxasAreaDraft(
      Object.fromEntries(areas.map(area => [area.id, String(area.valorTaxa).replace('.', ',')]))
    )
    setPrazosAreaDraft(
      Object.fromEntries(areas.map(area => [area.id, String(area.tempoEntregaInMinutes)]))
    )
    setAtivosAreaDraft(Object.fromEntries(areas.map(area => [area.id, area.ativo])))
    // Só ressincroniza quando id/valor/prazo/ativo da API muda — não enquanto o operador edita.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areasTaxaSignature])

  useEffect(() => {
    if (!raioAlcance) {
      setAlcanceKmTexto(String(ALCANCE_INICIAL_KM))
      return
    }
    const km = metrosParaKmRaio(raioAlcance.distanciaMaximaEmMetros)
    setAlcanceKmTexto(String(km).replace('.', ','))
  }, [raioAlcance])

  useEffect(() => onMapaGoogleAuthFailure(() => setMapaIndisponivel(true)), [])

  useEffect(() => {
    if (!enderecoEmpresa || !enderecoEmpresaGeocodeMinimo(enderecoEmpresa)) {
      setCentroEnderecoGeo(null)
      geocodeResultadoRef.current = null
      geocodeAssinaturaRef.current = ''
      if (!origemGeo) setPinRascunho(null)
      return
    }
    if (mapaIndisponivel) return
    if (geocodeAssinaturaRef.current === enderecoAssinatura) return

    let cancelado = false
    void (async () => {
      try {
        const resultado = await geocodificarEnderecoEmpresaViaGoogle(enderecoEmpresa)
        if (cancelado) return
        geocodeAssinaturaRef.current = enderecoAssinatura
        geocodeResultadoRef.current = resultado
        setCentroEnderecoGeo(resultado.enderecoLocalizacao)
        if (!origemGeo) {
          setPinRascunho(prev => prev ?? resultado.enderecoLocalizacao)
        }
      } catch (error) {
        if (cancelado) return
        geocodeAssinaturaRef.current = enderecoAssinatura
        if (isFalhaServicoMapaGoogle(error)) {
          setMapaIndisponivel(true)
          avisarMapaIndisponivelCliente('cobertura geocode', error)
          return
        }
        geocodeResultadoRef.current = null
        setCentroEnderecoGeo(null)
        if (!origemGeo) setPinRascunho(null)
      }
    })()
    return () => {
      cancelado = true
    }
  }, [enderecoAssinatura, enderecoEmpresa, mapaIndisponivel, origemGeo])

  const alertas = useMemo(() => {
    const items: { titulo: string; descricao: string; href?: string; label?: string }[] = []
    if (!empresaDelivery) {
      items.push({
        titulo: 'Delivery não configurado',
        descricao:
          'É necessário ter a empresa delivery cadastrada no backend para gerenciar áreas e raios.',
        href: DELIVERY_HUB_PATH,
        label: 'Ir para Delivery',
      })
    }
    if (mapaIndisponivel) {
      items.push({
        titulo: 'Mapa indisponível',
        descricao: MENSAGEM_MAPA_INDISPONIVEL_SUPORTE,
      })
    }
    if (
      empresaDelivery &&
      !mapaIndisponivel &&
      !geoConfigurada &&
      !geoQuery.isPending &&
      enderecoPreenchido &&
      !pinParaConfirmar
    ) {
      items.push({
        titulo: 'Marque a loja no mapa',
        descricao:
          'Clique no mapa para marcar a loja, até 1 km do endereço. Depois confirme a loja e o alcance no card.',
      })
    }
    if (
      empresaDelivery &&
      pinSalvoForaDoRaio &&
      !pinPendente
    ) {
      items.push({
        titulo: 'Pin fora do endereço',
        descricao:
          'O pin está a mais de 1 km do endereço da empresa. Ajuste para dentro do raio permitido e salve.',
      })
    }
    if (
      empresaDelivery &&
      !setupInicial &&
      geoConfigurada &&
      !temCoberturaAtiva &&
      !raiosQuery.isPending &&
      !areasQuery.isPending
    ) {
      items.push({
        titulo: 'Nenhuma cobertura de entrega ativa',
        descricao:
          'Defina o alcance do raio em km ou desenhe uma área pelos atalhos à direita do mapa.',
      })
    }
    return items
  }, [
    empresaDelivery,
    enderecoPreenchido,
    geoConfigurada,
    geoQuery.isPending,
    mapaIndisponivel,
    pinParaConfirmar,
    pinPendente,
    pinSalvoForaDoRaio,
    raiosQuery.isPending,
    areasQuery.isPending,
    setupInicial,
    temCoberturaAtiva,
  ])

  const limparEdicaoForma = useCallback(() => {
    setAreaFormaEditandoId(null)
    setFormaPathsRascunho(null)
    setFormaAlterada(false)
  }, [])

  const limparRascunhoArea = useCallback(() => {
    setGeometriaRascunho(null)
    setRascunhoPaths(null)
    setFerramenta('navegar')
    setPontosDesenho(0)
    setPodeConcluirDesenho(false)
  }, [])

  const handleFerramentaChange = useCallback(
    (proxima: FerramentaCobertura) => {
      if (proxima === 'poligono' || proxima === 'circulo') {
        limparEdicaoForma()
        setGeometriaRascunho(null)
        setRascunhoPaths(null)
        setMapaVisivel(true)
      }
      setFerramenta(proxima)
    },
    [limparEdicaoForma]
  )

  useEffect(() => {
    if (painelAba === 'areas') return
    setFerramenta('navegar')
    setGeometriaRascunho(null)
    setRascunhoPaths(null)
    setPontosDesenho(0)
    setPodeConcluirDesenho(false)
    setAreaFormaEditandoId(null)
    setFormaPathsRascunho(null)
    setFormaAlterada(false)
  }, [painelAba])

  const handleDesenhoEstadoChange = useCallback((estado: EstadoDesenhoCobertura) => {
    setPontosDesenho(estado.pontos)
    setPodeConcluirDesenho(estado.podeConcluir)
  }, [])

  const handleAcoesDesenhoProntas = useCallback((acoes: AcoesDesenhoCobertura | null) => {
    acoesDesenhoRef.current = acoes
  }, [])

  const handleFormaAreaAlterada = useCallback((areaId: string, paths: LatLngLiteral[]) => {
    setAreaFormaEditandoId(prev => prev ?? areaId)
    setFormaPathsRascunho(paths)
    setFormaAlterada(true)
  }, [])

  const handleSalvarFormaArea = useCallback(async () => {
    if (!areaFormaEditandoId || !formaPathsRascunho) {
      showToast.error('Ajuste os pontos da área antes de salvar.')
      return
    }
    try {
      const geometria = latLngPathsToGeoJsonPolygon(formaPathsRascunho)
      await atualizarAreaMutation.mutateAsync({
        id: areaFormaEditandoId,
        input: { area: geometria },
      })
      showToast.success('Forma da área atualizada.')
      limparEdicaoForma()
    } catch (error) {
      showToast.error(mensagemErroArea(error))
    }
  }, [areaFormaEditandoId, atualizarAreaMutation, formaPathsRascunho, limparEdicaoForma])

  const criarAreaDesenhada = useCallback(
    async (geometria: GeoJsonPolygon) => {
      try {
        await criarAreaMutation.mutateAsync({
          nome: `Área ${areas.length + 1}`,
          area: geometria,
          valorTaxa: 8,
          tempoEntregaInMinutes: TEMPO_PADRAO_FAIXA_KM,
          ativo: true,
        })
        showToast.success('Área criada. Clique no nome para editar.')
        setPainelAba('areas')
        limparRascunhoArea()
      } catch (error) {
        showToast.error(mensagemErroArea(error))
      }
    },
    [areas.length, criarAreaMutation, limparRascunhoArea]
  )

  const handleSalvarNomeArea = useCallback(
    async (area: AreaEntregaDTO, nome: string) => {
      try {
        await atualizarAreaMutation.mutateAsync({ id: area.id, input: { nome } })
        showToast.success('Nome da área atualizado.')
      } catch (error) {
        showToast.error(mensagemErroArea(error))
      }
    },
    [atualizarAreaMutation]
  )

  const handlePoligonoDesenhado = useCallback(
    (paths: LatLngLiteral[]) => {
      try {
        const geometria = latLngPathsToGeoJsonPolygon(paths)
        setFerramenta('navegar')
        void criarAreaDesenhada(geometria)
      } catch (error) {
        showToast.error(error instanceof Error ? error.message : 'Polígono inválido')
        setFerramenta('poligono')
      }
    },
    [criarAreaDesenhada]
  )

  const handleCirculoDesenhado = useCallback(
    (centro: LatLngLiteral, raioMetros: number) => {
      try {
        const geometria = geoJsonPolygonDeCirculo(centro, raioMetros)
        setFerramenta('navegar')
        void criarAreaDesenhada(geometria)
      } catch (error) {
        showToast.error(error instanceof Error ? error.message : 'Círculo inválido')
        setFerramenta('circulo')
      }
    },
    [criarAreaDesenhada]
  )

  const handleAreaArrastada = useCallback(
    async (areaId: string, paths: LatLngLiteral[]) => {
      try {
        const geometria = latLngPathsToGeoJsonPolygon(paths)
        await atualizarAreaMutation.mutateAsync({ id: areaId, input: { area: geometria } })
        showToast.success('Área reposicionada.')
        setFerramenta('navegar')
      } catch (error) {
        showToast.error(mensagemErroArea(error))
      }
    },
    [atualizarAreaMutation]
  )

  const handleApagarAreaNoMapa = useCallback(
    (areaId: string) => {
      const area = areas.find(item => item.id === areaId)
      if (!area) return
      setAreaExcluindo(area)
    },
    [areas]
  )

  const handlePinMovido = useCallback(
    (point: GeoJsonPoint) => {
      const centro = centroEnderecoGeo ?? origemGeo
      if (!centro) {
        setPinRascunho(point)
        setPinSnapEpoch(n => n + 1)
        return
      }
      const { ponto, limitado } = limitarPontoAoRaio(centro, point, RAIO_AJUSTE_PIN_METROS)
      if (limitado) {
        showToast.error('O pin só pode ser ajustado até 1 km do endereço da empresa.')
      }
      setPinRascunho(ponto)
      setPinSnapEpoch(n => n + 1)
    },
    [centroEnderecoGeo, origemGeo]
  )

  const handleCancelarPinRascunho = useCallback(() => {
    setPinRascunho(null)
    setPinSnapEpoch(n => n + 1)
  }, [])

  const handleSalvarLocalizacaoPin = useCallback(async () => {
    if (!pinRascunho) return
    const centro = centroEnderecoGeo ?? origemGeo
    if (centro && !pinDentroDoRaioPermitido(centro, pinRascunho)) {
      showToast.error('O pin só pode ser salvo até 1 km do endereço da empresa.')
      return
    }
    try {
      await atualizarOrigemMutation.mutateAsync({ point: pinRascunho })
      await geoQuery.refetch()
      setPinRascunho(null)
      showToast.success('Localização atualizada. Os raios passam a partir do novo ponto.')
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Não foi possível salvar a localização.')
    }
  }, [atualizarOrigemMutation, centroEnderecoGeo, geoQuery, origemGeo, pinRascunho])

  const handleToggleRaioAtivo = useCallback((raioId: string, ativo: boolean) => {
    setAtivosDraft(prev => ({ ...prev, [raioId]: ativo }))
  }, [])

  const handleToggleAreaAtivo = useCallback((areaId: string, ativo: boolean) => {
    setAtivosAreaDraft(prev => ({ ...prev, [areaId]: ativo }))
  }, [])

  const taxasPrazosPendentes = useMemo(() => {
    return raiosOrdenados.some(
      raio =>
        linhaTaxaPrazoPendente(
          taxasDraft[raio.id] ?? '',
          prazosDraft[raio.id] ?? '',
          raio.valorTaxa,
          raio.tempoEntregaInMinutes
        ) || ativoCoberturaPendente(ativosDraft[raio.id], raio.ativo)
    )
  }, [ativosDraft, prazosDraft, raiosOrdenados, taxasDraft])

  const taxasPrazosAreaPendentes = useMemo(() => {
    return areas.some(
      area =>
        linhaTaxaPrazoPendente(
          taxasAreaDraft[area.id] ?? '',
          prazosAreaDraft[area.id] ?? '',
          area.valorTaxa,
          area.tempoEntregaInMinutes
        ) || ativoCoberturaPendente(ativosAreaDraft[area.id], area.ativo)
    )
  }, [areas, ativosAreaDraft, prazosAreaDraft, taxasAreaDraft])

  const coberturaSuja =
    taxasPrazosPendentes ||
    taxasPrazosAreaPendentes ||
    pinPendente ||
    formaAlterada ||
    Boolean(rascunhoPaths?.length) ||
    geometriaRascunho != null
  useReportarCoberturaSuja(coberturaSuja)

  const handleSalvarTaxasLote = useCallback(async () => {
    const patches: Array<{
      id: string
      input: { valorTaxa?: number; tempoEntregaInMinutes?: number; ativo?: boolean }
    }> = []
    for (const raio of raiosOrdenados) {
      const input: { valorTaxa?: number; tempoEntregaInMinutes?: number; ativo?: boolean } = {}
      const brutoTaxa = taxasDraft[raio.id]
      if (brutoTaxa != null) {
        const valor = parseTaxaDraftCobertura(brutoTaxa)
        if (valor === null) {
          showToast.error(`Taxa inválida em ${formatAlcanceAteKm(raio.distanciaMaximaEmMetros)}.`)
          return
        }
        if (valor !== raio.valorTaxa) input.valorTaxa = valor
      }
      const brutoPrazo = prazosDraft[raio.id]
      if (brutoPrazo != null) {
        const minutos = parsePrazoDraftCobertura(brutoPrazo)
        if (minutos === null) {
          showToast.error(
            `Prazo inválido em ${formatAlcanceAteKm(raio.distanciaMaximaEmMetros)}. Use minutos inteiros.`
          )
          return
        }
        if (minutos !== raio.tempoEntregaInMinutes) input.tempoEntregaInMinutes = minutos
      }
      if (ativoCoberturaPendente(ativosDraft[raio.id], raio.ativo)) {
        input.ativo = ativosDraft[raio.id]
      }
      if (
        input.valorTaxa !== undefined ||
        input.tempoEntregaInMinutes !== undefined ||
        input.ativo !== undefined
      ) {
        patches.push({ id: raio.id, input })
      }
    }
    if (patches.length === 0) {
      showToast.info('Nenhuma alteração para salvar.')
      return
    }
    try {
      const resultado = await atualizarRaiosLoteMutation.mutateAsync(patches)
      if (resultado.ok < resultado.total) {
        showToast.error(mensagemFalhaLoteCobertura(resultado))
        return
      }
      const mudouTaxa = patches.some(p => p.input.valorTaxa !== undefined)
      const mudouPrazo = patches.some(p => p.input.tempoEntregaInMinutes !== undefined)
      const mudouAtivo = patches.some(p => p.input.ativo !== undefined)
      if (mudouTaxa && mudouPrazo) {
        showToast.success('Taxas e prazos atualizados.')
      } else if (mudouPrazo) {
        showToast.success(
          patches.length === 1 ? 'Prazo atualizado.' : `${patches.length} prazos atualizados.`
        )
      } else if (mudouTaxa) {
        showToast.success(
          patches.length === 1 ? 'Taxa atualizada.' : `${patches.length} taxas atualizadas.`
        )
      } else if (mudouAtivo) {
        showToast.success('Cobertura atualizada.')
      }
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Não foi possível salvar as taxas.')
    }
  }, [ativosDraft, atualizarRaiosLoteMutation, prazosDraft, raiosOrdenados, taxasDraft])

  const handleSalvarTaxasAreasLote = useCallback(async () => {
    const patches: Array<{
      id: string
      input: { valorTaxa?: number; tempoEntregaInMinutes?: number; ativo?: boolean }
    }> = []
    for (const area of areas) {
      const input: { valorTaxa?: number; tempoEntregaInMinutes?: number; ativo?: boolean } = {}
      const brutoTaxa = taxasAreaDraft[area.id]
      if (brutoTaxa != null) {
        const valor = parseTaxaDraftCobertura(brutoTaxa)
        if (valor === null) {
          showToast.error(`Taxa inválida em ${area.nome?.trim() || 'área sem nome'}.`)
          return
        }
        if (valor !== area.valorTaxa) input.valorTaxa = valor
      }
      const brutoPrazo = prazosAreaDraft[area.id]
      if (brutoPrazo != null) {
        const minutos = parsePrazoDraftCobertura(brutoPrazo)
        if (minutos === null) {
          showToast.error(
            `Prazo inválido em ${area.nome?.trim() || 'área sem nome'}. Use minutos inteiros.`
          )
          return
        }
        if (minutos !== area.tempoEntregaInMinutes) input.tempoEntregaInMinutes = minutos
      }
      if (ativoCoberturaPendente(ativosAreaDraft[area.id], area.ativo)) {
        input.ativo = ativosAreaDraft[area.id]
      }
      if (
        input.valorTaxa !== undefined ||
        input.tempoEntregaInMinutes !== undefined ||
        input.ativo !== undefined
      ) {
        patches.push({ id: area.id, input })
      }
    }
    if (patches.length === 0) {
      showToast.info('Nenhuma alteração para salvar.')
      return
    }
    try {
      const resultado = await atualizarAreasLoteMutation.mutateAsync(patches)
      if (resultado.ok < resultado.total) {
        showToast.error(mensagemFalhaLoteCobertura(resultado))
        return
      }
      const mudouTaxa = patches.some(p => p.input.valorTaxa !== undefined)
      const mudouPrazo = patches.some(p => p.input.tempoEntregaInMinutes !== undefined)
      const mudouAtivo = patches.some(p => p.input.ativo !== undefined)
      if (mudouTaxa && mudouPrazo) {
        showToast.success('Taxas e prazos das áreas atualizados.')
      } else if (mudouPrazo) {
        showToast.success(
          patches.length === 1 ? 'Prazo atualizado.' : `${patches.length} prazos atualizados.`
        )
      } else if (mudouTaxa) {
        showToast.success(
          patches.length === 1 ? 'Taxa atualizada.' : `${patches.length} taxas atualizadas.`
        )
      } else if (mudouAtivo) {
        showToast.success('Cobertura das áreas atualizada.')
      }
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'Não foi possível salvar as taxas das áreas.'
      )
    }
  }, [areas, ativosAreaDraft, atualizarAreasLoteMutation, prazosAreaDraft, taxasAreaDraft])

  const handleDefinirAlcanceRaio = useCallback(async () => {
    const parsed = parseAlcanceKmInteiro(alcanceKmTexto, DISTANCIA_MAXIMA_KM_RAIO)
    if (!parsed.ok) {
      showToast.error(parsed.erro)
      return
    }
    const km = parsed.km
    const { criarKm, excluirIds } = sincronizarFaixasAlcanceKm(raios, km)
    if (criarKm.length === 0 && excluirIds.length === 0) {
      showToast.info(`Alcance já está em ${km} km. Ajuste as taxas em Taxas por Raio.`)
      setPainelAba('raios')
      return
    }
    const tempo =
      raios.find(raio => raio.tempoEntregaInMinutes > 0)?.tempoEntregaInMinutes ??
      TEMPO_PADRAO_FAIXA_KM
    setDefinindoAlcance(true)
    try {
      if (excluirIds.length > 0) {
        await excluirRaiosLoteMutation.mutateAsync(excluirIds)
      }
      if (criarKm.length > 0) {
        await criarRaiosLoteMutation.mutateAsync(
          criarKm.map(faixaKm => ({
            nome: formatAlcanceAteKm(kmParaMetrosRaio(faixaKm)),
            distanciaMaximaEmMetros: kmParaMetrosRaio(faixaKm),
            valorTaxa: 0,
            tempoEntregaInMinutes: tempo,
            ativo: true,
          }))
        )
      }
      const partes: string[] = [`Alcance Até ${km} km.`]
      if (criarKm.length > 0) {
        partes.push(
          `${criarKm.length} faixa${criarKm.length === 1 ? '' : 's'} de 1 km criada${criarKm.length === 1 ? '' : 's'}.`
        )
      }
      if (excluirIds.length > 0) {
        partes.push(
          `${excluirIds.length} faixa${excluirIds.length === 1 ? '' : 's'} acima do alcance excluída${excluirIds.length === 1 ? '' : 's'}.`
        )
      }
      showToast.success(partes.join(' '))
      await raiosQuery.refetch()
      await areasQuery.refetch()
      setPainelAba('raios')
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'Não foi possível definir o alcance do raio.'
      )
    } finally {
      setDefinindoAlcance(false)
    }
  }, [
    alcanceKmTexto,
    areasQuery,
    criarRaiosLoteMutation,
    excluirRaiosLoteMutation,
    raios,
    raiosQuery,
  ])

  const handleConfirmarLojaEAlcance = useCallback(async () => {
    const parsed = parseAlcanceKmInteiro(alcanceKmTexto, DISTANCIA_MAXIMA_KM_RAIO)
    if (!parsed.ok) {
      showToast.error(parsed.erro)
      return
    }
    const ponto = pinRascunho ?? centroEnderecoGeo ?? origemGeo
    if (!ponto) {
      showToast.error('Marque a loja no mapa, até 1 km do endereço, e confirme.')
      return
    }
    const centro = centroEnderecoGeo ?? origemGeo
    if (centro && !pinDentroDoRaioPermitido(centro, ponto)) {
      showToast.error('O pin só pode ser salvo até 1 km do endereço da empresa.')
      return
    }
    const km = parsed.km
    setConfirmandoSetup(true)
    try {
      const precisaSalvarPin = !origemGeo || !pontosGeoIguais(ponto, origemGeo)
      if (precisaSalvarPin) {
        await atualizarOrigemMutation.mutateAsync({
          point: ponto,
          providerEnderecoId: geocodeResultadoRef.current?.providerEnderecoId,
        })
        await geoQuery.refetch()
        setPinRascunho(null)
      }
      const { criarKm, excluirIds } = sincronizarFaixasAlcanceKm(raios, km)
      if (criarKm.length > 0 || excluirIds.length > 0) {
        const tempo =
          raios.find(raio => raio.tempoEntregaInMinutes > 0)?.tempoEntregaInMinutes ??
          TEMPO_PADRAO_FAIXA_KM
        if (excluirIds.length > 0) {
          await excluirRaiosLoteMutation.mutateAsync(excluirIds)
        }
        if (criarKm.length > 0) {
          await criarRaiosLoteMutation.mutateAsync(
            criarKm.map(faixaKm => ({
              nome: formatAlcanceAteKm(kmParaMetrosRaio(faixaKm)),
              distanciaMaximaEmMetros: kmParaMetrosRaio(faixaKm),
              valorTaxa: 0,
              tempoEntregaInMinutes: tempo,
              ativo: true,
            }))
          )
        }
        await raiosQuery.refetch()
        await areasQuery.refetch()
      }
      showToast.success(
        `Loja confirmada. Alcance Até ${km} km gravado. Ajuste as taxas em Taxas por Raio.`
      )
      setPainelAba('raios')
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'Não foi possível confirmar a loja e o alcance.'
      )
    } finally {
      setConfirmandoSetup(false)
    }
  }, [
    alcanceKmTexto,
    areasQuery,
    atualizarOrigemMutation,
    centroEnderecoGeo,
    criarRaiosLoteMutation,
    excluirRaiosLoteMutation,
    geoQuery,
    origemGeo,
    pinRascunho,
    raios,
    raiosQuery,
  ])

  const handleConfirmarExclusaoArea = useCallback(async () => {
    if (!areaExcluindo) return
    try {
      await excluirAreaMutation.mutateAsync(areaExcluindo.id)
      showToast.success('Área excluída.')
      setAreaExcluindo(null)
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Não foi possível excluir a área.')
    }
  }, [areaExcluindo, excluirAreaMutation])

  if (empresaDeliveryQuery.isPending) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <JiffyLoading />
      </div>
    )
  }

  if (empresaDeliveryQuery.isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-sm font-semibold text-primary-text">
          Não foi possível carregar os dados do Delivery.
        </p>
        <p className="text-sm text-secondary-text">{empresaDeliveryQuery.error.message}</p>
      </div>
    )
  }

  if (geoQuery.isPending) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <JiffyLoading />
      </div>
    )
  }

  if (!enderecoPreenchido) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <MdWarning className="h-10 w-10 text-amber-500" aria-hidden />
        <p className="text-base font-semibold text-primary-text">
          Endereço da empresa obrigatório
        </p>
        <p className="max-w-md text-sm text-secondary-text">
          Preencha rua, número, cidade e estado na aba Empresa para abrir a cobertura de entrega. O
          pin da loja é marcado a partir desse endereço.
        </p>
        <Link
          href={configuracoesTabPath('empresa')}
          className="mt-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
        >
          Ir para Empresa
        </Link>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-100">
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0 bg-gray-50">
          <div className="absolute inset-0">
              {!mapaVisivel ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                  <MdMap className="h-10 w-10 text-secondary-text/40" aria-hidden />
                 
                  <p className="max-w-sm text-xs text-secondary-text/80">
                    Use as ferramentas à direita do mapa para desenhar áreas. O alcance do raio
                    é definido no card, em Cobertura Raio.
                  </p>
                  <button
                    type="button"
                    onClick={() => setMapaVisivel(true)}
                    disabled={!empresaDelivery}
                    className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-primary bg-white px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <MdMap className="h-4 w-4" aria-hidden />
                    Exibir mapa
                  </button>
                </div>
              ) : geoQuery.isPending ? (
                <div className="absolute inset-0 animate-pulse bg-gray-100" aria-hidden />
              ) : (
                <div className="absolute inset-0">
                  <CoberturaDeliveryMap
                    key="cobertura-mapa"
                    origem={origemGeo ?? (setupInicial ? pinRascunho : null)}
                    raios={raiosNoMapa}
                    areas={areasNoMapa}
                    ferramenta={ferramenta}
                    rascunhoPaths={rascunhoPaths}
                    areaDestacadaId={destaqueMapa.areaDestacadaId}
                    raioDestacadoId={destaqueMapa.raioDestacadoId}
                    destacarTodasAreas={destaqueMapa.destacarTodasAreas}
                    areaFormaEditandoId={areaFormaEditandoId}
                    ferramentasHabilitadas={Boolean(empresaDelivery)}
                    desenhoHabilitado={painelAba === 'areas'}
                    onFerramentaChange={handleFerramentaChange}
                    onPoligonoDesenhado={handlePoligonoDesenhado}
                    onCirculoDesenhado={handleCirculoDesenhado}
                    onDesenhoCancelado={limparRascunhoArea}
                    onFormaAreaAlterada={handleFormaAreaAlterada}
                    onAreaArrastada={(id, paths) => void handleAreaArrastada(id, paths)}
                    onApagarArea={handleApagarAreaNoMapa}
                    pinRascunho={pinRascunho}
                    pinSnapEpoch={pinSnapEpoch}
                    centroAjustePin={centroAjustePin}
                    onPinMovido={handlePinMovido}
                    onDesenhoEstadoChange={handleDesenhoEstadoChange}
                    onAcoesDesenhoProntas={handleAcoesDesenhoProntas}
                    onHoverArea={id => destacarNaLista({ tipo: 'area', id })}
                    onHoverRaio={id => destacarNaLista({ tipo: 'raio', id })}
                    onHoverFim={() => destacarNaLista(null)}
                  />
                </div>
              )}
            </div>
        </div>

        <div className="pointer-events-none absolute inset-0 z-20 flex items-start p-3 md:p-4">
          <div className="pointer-events-auto relative mr-14 flex max-h-full w-full max-w-[380px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="shrink-0 px-4 pt-3">
              <h2 className="text-base font-semibold text-primary-text">Áreas de Entrega</h2>
              <nav
                className="mt-2 flex flex-wrap gap-3 border-b border-gray-100"
                aria-label="Painel de cobertura"
              >
                {COBERTURA_PAINEL_ABAS.map(aba => (
                  <button
                    key={aba.id}
                    type="button"
                    onClick={() => setPainelAba(aba.id)}
                    className={`-mb-px border-b-2 pb-2 text-xs font-semibold ${
                      painelAba === aba.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-secondary-text hover:text-primary-text'
                    }`}
                  >
                    {aba.label}
                  </button>
                ))}
              </nav>
            </div>

            {setupInicial ? (
              <div className="mx-3 mt-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
                <p className="text-sm font-semibold text-primary-text">Confirme a loja e o alcance</p>
                <p className="mt-0.5 text-xs text-secondary-text">
                  O pin está no endereço da empresa. Clique no mapa ou arraste até 1 km se precisar.
                  Informe o alcance e confirme para gravar a loja e as faixas de 1 em 1 km.
                </p>
                <div className="mt-2.5 flex items-center gap-1.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label="Alcance inicial do raio em km"
                    value={alcanceKmTexto}
                    onChange={event => setAlcanceKmTexto(event.target.value)}
                    disabled={salvando || confirmandoSetup}
                    className="w-16 rounded-lg border border-gray-200 bg-white px-2 py-2 text-center text-sm text-primary-text outline-none focus:border-primary"
                  />
                  <span className="shrink-0 text-xs font-semibold text-secondary-text">km</span>
                  <button
                    type="button"
                    onClick={() => void handleConfirmarLojaEAlcance()}
                    disabled={salvando || confirmandoSetup || !empresaDelivery}
                    className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {confirmandoSetup ? 'Confirmando…' : 'Confirmar loja e alcance'}
                  </button>
                </div>
              </div>
            ) : pinPendente ? (
              <div className="mx-3 mt-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
                <p className="text-sm font-semibold text-primary-text">Pin movido</p>
                <p className="mt-0.5 text-xs text-secondary-text">
                  Salve para recentrar os raios a partir do novo ponto. Até lá, a cobertura continua no
                  endereço gravado.
                </p>
                <div className="mt-2.5 flex gap-1.5">
                  <button
                    type="button"
                    onClick={handleCancelarPinRascunho}
                    disabled={salvandoPin}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-primary-text hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSalvarLocalizacaoPin()}
                    disabled={salvandoPin}
                    className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {salvandoPin ? 'Salvando…' : 'Salvar localização'}
                  </button>
                </div>
              </div>
            ) : null}

            {alertas.length > 0 ? (
              <div className="space-y-2 px-3 pt-3">
                {alertas.map(alerta => (
                  <section
                    key={alerta.titulo}
                    role="alert"
                    className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-amber-950"
                  >
                    <MdWarning className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{alerta.titulo}</p>
                      <p className="mt-0.5 text-xs text-amber-900/80">{alerta.descricao}</p>
                      {alerta.href && alerta.label ? (
                        <Link
                          href={alerta.href}
                          className="mt-1 inline-block text-xs font-semibold text-secondary underline-offset-2 hover:underline"
                        >
                          {alerta.label}
                        </Link>
                      ) : null}
                    </div>
                  </section>
                ))}
              </div>
            ) : null}

            {ferramenta === 'poligono' ? (
              <div className="mx-3 mt-3 rounded-xl bg-primary px-3 py-2.5 text-xs text-white">
                <p className="font-semibold">Desenhando área</p>
                <p className="mt-1 text-white/85">
                  {pontosDesenho === 0
                    ? 'Clique no mapa para marcar os vértices.'
                    : `${pontosDesenho} ponto${pontosDesenho === 1 ? '' : 's'}. Mínimo de 3 para concluir.`}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => acoesDesenhoRef.current?.desfazer()}
                    disabled={pontosDesenho === 0}
                    className="rounded-md bg-white/20 px-2 py-1 font-semibold hover:bg-white/30 disabled:opacity-40"
                  >
                    Desfazer
                  </button>
                  <button
                    type="button"
                    onClick={() => acoesDesenhoRef.current?.concluir()}
                    disabled={!podeConcluirDesenho}
                    className="rounded-md bg-white px-2 py-1 font-semibold text-primary disabled:opacity-40"
                  >
                    Concluir área
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (acoesDesenhoRef.current) acoesDesenhoRef.current.cancelar()
                      else limparRascunhoArea()
                    }}
                    className="rounded-md bg-white/20 px-2 py-1 font-semibold hover:bg-white/30"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : ferramenta === 'circulo' ? (
              <div className="mx-3 mt-3 rounded-xl bg-primary px-3 py-2.5 text-xs text-white">
                <p className="font-semibold">Desenhando círculo</p>
                <p className="mt-1 text-white/85">
                  Clique no centro e de novo na borda para finalizar.
                </p>
                <button
                  type="button"
                  onClick={() => setFerramenta('navegar')}
                  className="mt-2 rounded-md bg-white/20 px-2 py-1 font-semibold hover:bg-white/30"
                >
                  Cancelar
                </button>
              </div>
            ) : areaFormaEditandoId ? (
              <div className="mx-3 mt-3 rounded-xl bg-secondary px-3 py-2.5 text-xs text-white">
                <p className="font-semibold">
                  Editando forma
                  {areaFormaEditando?.nome?.trim()
                    ? ` de “${areaFormaEditando.nome.trim()}”`
                    : ''}
                </p>
                <p className="mt-1 text-white/85">
                  Arraste os pontos no mapa
                  {formaAlterada ? ' e salve as alterações.' : '.'}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={limparEdicaoForma}
                    disabled={salvando}
                    className="rounded-md bg-white/20 px-2 py-1 font-semibold hover:bg-white/30 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSalvarFormaArea()}
                    disabled={salvando || !formaAlterada || !formaPathsRascunho}
                    className="rounded-md bg-white px-2 py-1 font-semibold text-secondary disabled:opacity-50"
                  >
                    Salvar forma
                  </button>
                </div>
              </div>
            ) : null}

            {painelAba === 'resumo' ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="grid grid-cols-2 gap-2 px-3 py-3">
                  <div
                    className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 text-center"
                    onMouseEnter={() => destacarNaLista({ tipo: 'areas', id: null })}
                    onMouseLeave={() => destacarNaLista(null)}
                  >
                    <MdMap className="mx-auto h-5 w-5 text-primary-text" aria-hidden />
                    <p className="mt-1 text-2xl font-bold text-primary-text">{areas.length}</p>
                    <p className="text-[11px] font-semibold text-primary-text">Cobertura Área</p>
                    <p className="mt-0.5 text-[10px] text-secondary-text">Atalhos à direita</p>
                  </div>
                  <div
                    className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 text-center"
                    onMouseEnter={() =>
                      raioAlcance
                        ? destacarNaLista({ tipo: 'raio', id: raioAlcance.id })
                        : destacarNaLista(null)
                    }
                    onMouseLeave={() => destacarNaLista(null)}
                  >
                    <MdMyLocation className="mx-auto h-5 w-5 text-primary-text" aria-hidden />
                    <p className="mt-1 text-2xl font-bold leading-none text-primary-text">
                      {alcanceKm > 0 ? `Até ${alcanceKm} km` : '—'}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-primary-text">Cobertura Raio</p>
                    <p className="mt-0.5 text-[10px] text-secondary-text">Faixas de 1 em 1 km</p>
                  </div>
                </div>
                <p className="px-3 pb-3 text-[11px] leading-snug text-secondary-text">
                  Use Taxas por Área para polígonos e Taxas por Raio para as faixas de km. O alcance
                  do raio é definido na aba Taxas por Raio.
                </p>
              </div>
            ) : painelAba === 'areas' ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <p className="px-4 pt-2 text-[11px] leading-snug text-secondary-text">
                  Cada área tem nome, taxa e prazo próprios. Clique no nome para editar. Desenhe no
                  mapa com os atalhos à direita.
                </p>
                <div className="grid grid-cols-[minmax(3.2rem,0.9fr)_minmax(3.1rem,1fr)_minmax(2.6rem,0.8fr)_1.4rem_auto] items-center gap-1 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-secondary-text">
                  <span>Nome</span>
                  <span>Taxa</span>
                  <span>Prazo</span>
                  <span className="sr-only">Ativo</span>
                  <span className="text-right">Ações</span>
                </div>
                <div className="min-h-0 flex-1 overflow-auto border-t border-gray-100">
                  {areasQuery.isPending ? (
                    <div className="flex justify-center p-6">
                      <JiffyLoading />
                    </div>
                  ) : (
                    <>
                      {areas.length === 0 ? (
                        <p className="p-4 text-center text-xs text-secondary-text">
                          Nenhuma área salva. Use o polígono ou o círculo à direita. A área pode
                          ficar fora do raio e tem nome e taxa próprios.
                        </p>
                      ) : (
                        <div>
                          {areas.map(area => (
                            <div
                              key={area.id}
                              className={`grid grid-cols-[minmax(3.2rem,0.9fr)_minmax(3.1rem,1fr)_minmax(2.6rem,0.8fr)_1.4rem_auto] items-center gap-1 px-3 py-2 text-sm ${
                                destaqueMapa.destacarTodasAreas ||
                                destaqueMapa.areaDestacadaId === area.id
                                  ? 'bg-gray-100'
                                  : 'hover:bg-gray-100'
                              }`}
                              onMouseEnter={() => destacarNaLista({ tipo: 'area', id: area.id })}
                              onMouseLeave={() => destacarNaLista(null)}
                            >
                              <NomeAreaInline
                                area={area}
                                salvando={salvando}
                                onSalvar={nome => handleSalvarNomeArea(area, nome)}
                              />
                              <CampoTaxaInline
                                label={`Taxa ${area.nome?.trim() || area.id}`}
                                value={taxasAreaDraft[area.id] ?? ''}
                                disabled={salvando}
                                onChange={value =>
                                  setTaxasAreaDraft(prev => ({ ...prev, [area.id]: value }))
                                }
                              />
                              <CampoPrazoInline
                                label={`Prazo ${area.nome?.trim() || area.id}`}
                                value={prazosAreaDraft[area.id] ?? ''}
                                disabled={salvando}
                                onChange={value =>
                                  setPrazosAreaDraft(prev => ({ ...prev, [area.id]: value }))
                                }
                              />
                              <JiffyIconSwitch
                                checked={ativosAreaDraft[area.id] ?? area.ativo}
                                onChange={e => handleToggleAreaAtivo(area.id, e.target.checked)}
                                disabled={salvando}
                                size="xs"
                                inputProps={{
                                  'aria-label': `Ativar área ${area.nome ?? area.id}`,
                                }}
                              />
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => setAreaExcluindo(area)}
                                  disabled={salvando}
                                  className="rounded-lg p-1.5 text-secondary-text hover:bg-red-50 hover:text-red-600"
                                  aria-label="Excluir área"
                                  title="Excluir área"
                                >
                                  <MdDeleteOutline className="h-5 w-5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="shrink-0 space-y-2 border-t border-gray-100 px-3 py-2">
                  <BotaoSalvarTaxasLote
                    pendente={taxasPrazosAreaPendentes}
                    disabled={salvando || areas.length === 0 || !taxasPrazosAreaPendentes}
                    salvando={atualizarAreasLoteMutation.isPending}
                    onClick={() => void handleSalvarTaxasAreasLote()}
                  />
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="mx-3 mt-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
                  <div className="flex items-center gap-2">
                    <MdMyLocation className="h-5 w-5 shrink-0 text-primary-text" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-bold leading-none text-primary-text">
                        {alcanceKm > 0 ? `Até ${alcanceKm} km` : '—'}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold text-primary-text">
                        Cobertura Raio
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      aria-label="Alcance máximo do raio em km"
                      placeholder="4"
                      value={alcanceKmTexto}
                      onChange={event => setAlcanceKmTexto(event.target.value)}
                      disabled={
                        salvando ||
                        definindoAlcance ||
                        confirmandoSetup ||
                        !empresaDelivery ||
                        (!geoConfigurada && !setupInicial)
                      }
                      className="w-12 rounded-md border border-gray-200 bg-white px-1 py-1 text-center text-xs text-primary-text outline-none focus:border-primary"
                    />
                    <span className="shrink-0 text-[11px] font-semibold text-secondary-text">
                      km
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleDefinirAlcanceRaio()}
                      disabled={
                        salvando ||
                        definindoAlcance ||
                        confirmandoSetup ||
                        !empresaDelivery ||
                        !geoConfigurada ||
                        setupInicial
                      }
                      className="inline-flex min-w-[4.5rem] shrink-0 items-center justify-center gap-1 rounded-md bg-primary px-2 py-1 text-[10px] font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
                    >
                      {definindoAlcance ? (
                        <>
                          <span
                            className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"
                            aria-hidden
                          />
                          <span>Aguarde</span>
                        </>
                      ) : raioAlcance ? (
                        'Atualizar'
                      ) : (
                        'Definir'
                      )}
                    </button>
                    </div>
                  </div>
                </div>
                <p className="px-4 pt-2 text-[11px] leading-snug text-secondary-text">
                  O alcance gera faixas de 1 em 1 km. Reduzir exclui as faixas acima. Taxa e prazo
                  valem naquela faixa.
                </p>
                <div className="grid grid-cols-[minmax(4.5rem,1.1fr)_minmax(3.4rem,1fr)_minmax(3rem,0.85fr)_1.75rem] items-center gap-1 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-secondary-text">
                  <span>Alcance</span>
                  <span>Taxa</span>
                  <span>Prazo</span>
                  <span className="sr-only">Ativo</span>
                </div>
                <div className="min-h-0 flex-1 overflow-auto">
                  {raiosQuery.isPending ? (
                    <div className="flex justify-center p-6">
                      <JiffyLoading />
                    </div>
                  ) : raiosOrdenados.length === 0 ? (
                    <p className="p-4 text-center text-xs text-secondary-text">
                      Defina o alcance acima. O sistema cria Até 1 km, Até 2 km… até o máximo para
                      você colocar as taxas.
                    </p>
                  ) : (
                    <div>
                      {raiosOrdenados.map(raio => (
                        <div
                          key={raio.id}
                          className={`grid grid-cols-[minmax(4.5rem,1.1fr)_minmax(3.4rem,1fr)_minmax(3rem,0.85fr)_1.75rem] items-center gap-1 px-3 py-2 text-sm ${
                            destaqueMapa.raioDestacadoId === raio.id
                              ? 'bg-gray-100'
                              : 'hover:bg-gray-100'
                          }`}
                          onMouseEnter={() => destacarNaLista({ tipo: 'raio', id: raio.id })}
                          onMouseLeave={() => destacarNaLista(null)}
                        >
                          <span className="truncate text-xs font-medium text-primary-text">
                            {formatAlcanceAteKm(raio.distanciaMaximaEmMetros)}
                          </span>
                          <CampoTaxaInline
                            label={`Taxa ${formatAlcanceAteKm(raio.distanciaMaximaEmMetros)}`}
                            value={taxasDraft[raio.id] ?? ''}
                            disabled={salvando}
                            onChange={value =>
                              setTaxasDraft(prev => ({ ...prev, [raio.id]: value }))
                            }
                          />
                          <CampoPrazoInline
                            label={`Prazo ${formatAlcanceAteKm(raio.distanciaMaximaEmMetros)}`}
                            value={prazosDraft[raio.id] ?? ''}
                            disabled={salvando}
                            onChange={value =>
                              setPrazosDraft(prev => ({ ...prev, [raio.id]: value }))
                            }
                          />
                          <JiffyIconSwitch
                            checked={ativosDraft[raio.id] ?? raio.ativo}
                            onChange={e => handleToggleRaioAtivo(raio.id, e.target.checked)}
                            disabled={salvando}
                            size="xs"
                            inputProps={{
                              'aria-label': `Ativar raio ${formatAlcanceAteKm(raio.distanciaMaximaEmMetros)}`,
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="shrink-0 space-y-2 border-t border-gray-100 px-3 py-2">
                  <BotaoSalvarTaxasLote
                    pendente={taxasPrazosPendentes}
                    disabled={salvando || raiosOrdenados.length === 0 || !taxasPrazosPendentes}
                    salvando={atualizarRaiosLoteMutation.isPending}
                    onClick={() => void handleSalvarTaxasLote()}
                  />
                </div>
              </div>
            )}

            {!mapaIndisponivel &&
            (definindoAlcance || confirmandoSetup || salvandoPin) ? (
              <div
                className="absolute inset-0 z-10 flex items-center justify-center bg-white/85"
                role="status"
                aria-live="polite"
                aria-label={
                  confirmandoSetup
                    ? 'Confirmando loja e alcance'
                    : salvandoPin
                      ? 'Salvando localização'
                      : 'Atualizando cobertura'
                }
              >
                <JiffyLoading
                  size={48}
                  className="py-0"
                  text={
                    confirmandoSetup
                      ? 'Confirmando loja e alcance…'
                      : salvandoPin
                        ? 'Salvando localização…'
                        : 'Atualizando cobertura…'
                  }
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog open={areaExcluindo != null} onOpenChange={open => !open && setAreaExcluindo(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir área de entrega?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-secondary-text">
            A área{' '}
            <span className="font-semibold text-primary-text">
              {areaExcluindo?.nome?.trim() || 'sem nome'}
            </span>{' '}
            será removida. Endereços dentro dela podem deixar de receber cotação.
          </p>
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setAreaExcluindo(null)}
              disabled={excluirAreaMutation.isPending}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-secondary-text"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmarExclusaoArea()}
              disabled={excluirAreaMutation.isPending}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {excluirAreaMutation.isPending ? 'Excluindo…' : 'Excluir'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
