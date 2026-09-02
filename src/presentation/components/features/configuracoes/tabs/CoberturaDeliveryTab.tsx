'use client'

import dynamic from 'next/dynamic'
import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  MdAdd,
  MdDeleteOutline,
  MdDraw,
  MdEdit,
  MdMap,
  MdMyLocation,
  MdRadar,
  MdVisibilityOff,
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
import { RaioEntregaFormModal } from '@/src/presentation/components/features/configuracoes/RaioEntregaFormModal'
import { AreaEntregaFormModal } from '@/src/presentation/components/features/configuracoes/AreaEntregaFormModal'
import { useEmpresaDeliveryMe } from '@/src/presentation/hooks/useEmpresaDeliveryMe'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import {
  useAtualizarRaioEntregaDelivery,
  useCriarRaioEntregaDelivery,
  useExcluirRaioEntregaDelivery,
  useRaiosEntregaDelivery,
} from '@/src/presentation/hooks/useRaiosEntregaDelivery'
import {
  useAreasEntregaDelivery,
  useAtualizarAreaEntregaDelivery,
  useCriarAreaEntregaDelivery,
  useExcluirAreaEntregaDelivery,
} from '@/src/presentation/hooks/useAreasEntregaDelivery'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { showToast } from '@/src/shared/utils/toast'
import { configuracoesTabPath } from '@/src/shared/constants/configuracoesRoutes'
import { lerEnderecoLocalizacaoDoPayloadEmpresa } from '@/src/shared/utils/geolocalizacaoEmpresa'
import type { GeoJsonPoint } from '@/src/shared/types/geoJsonPoint'
import {
  latLngPathsToGeoJsonPolygon,
  type GeoJsonPolygon,
  type LatLngLiteral,
} from '@/src/shared/types/geoJsonPolygon'
import {
  formatDistanciaRaio,
  formatValorTaxaRaio,
  raioEntregaFormToCreateInput,
  raioEntregaFormToUpdateInput,
  areaEntregaFormToCreateInput,
  areaEntregaFormToUpdateInput,
  type RaioEntregaDTO,
  type RaioEntregaFormValues,
  type AreaEntregaDTO,
  type AreaEntregaFormValues,
} from '@/src/application/dto/delivery/CoberturaEntregaDTO'
import { temCoberturaEntregaAtiva } from '@/src/application/mappers/CoberturaEntregaMapper'

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

function mensagemErroArea(error: unknown): string {
  const msg = error instanceof Error ? error.message : 'Não foi possível salvar a área.'
  if (/sobrepos|overlap|intersect/i.test(msg)) {
    return 'Esta área sobrepõe outra já cadastrada. Ajuste o desenho e tente novamente.'
  }
  return msg
}

export function CoberturaDeliveryTab() {
  const empresaDeliveryQuery = useEmpresaDeliveryMe()
  const raiosQuery = useRaiosEntregaDelivery({
    enabled: empresaDeliveryQuery.isSuccess && empresaDeliveryQuery.data != null,
  })
  const areasQuery = useAreasEntregaDelivery({
    enabled: empresaDeliveryQuery.isSuccess && empresaDeliveryQuery.data != null,
  })
  const criarRaioMutation = useCriarRaioEntregaDelivery()
  const atualizarRaioMutation = useAtualizarRaioEntregaDelivery()
  const excluirRaioMutation = useExcluirRaioEntregaDelivery()
  const criarAreaMutation = useCriarAreaEntregaDelivery()
  const atualizarAreaMutation = useAtualizarAreaEntregaDelivery()
  const excluirAreaMutation = useExcluirAreaEntregaDelivery()

  const geoQuery = useSecureTenantQuery<{ enderecoLocalizacao: GeoJsonPoint | null }>(
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
      return lerEnderecoLocalizacaoDoPayloadEmpresa(endereco)
    },
    { staleTime: 1000 * 60 * 2, refetchOnWindowFocus: false }
  )

  const [modalRaioAberto, setModalRaioAberto] = useState(false)
  const [raioEditando, setRaioEditando] = useState<RaioEntregaDTO | null>(null)
  const [raioExcluindo, setRaioExcluindo] = useState<RaioEntregaDTO | null>(null)

  const [modalAreaAberto, setModalAreaAberto] = useState(false)
  const [areaEditando, setAreaEditando] = useState<AreaEntregaDTO | null>(null)
  const [areaExcluindo, setAreaExcluindo] = useState<AreaEntregaDTO | null>(null)
  const [modoDesenho, setModoDesenho] = useState(false)
  const [geometriaRascunho, setGeometriaRascunho] = useState<GeoJsonPolygon | null>(null)
  const [rascunhoPaths, setRascunhoPaths] = useState<LatLngLiteral[] | null>(null)
  const [mapaVisivel, setMapaVisivel] = useState(false)
  const [areaFormaEditandoId, setAreaFormaEditandoId] = useState<string | null>(null)
  const [formaPathsRascunho, setFormaPathsRascunho] = useState<LatLngLiteral[] | null>(null)
  const [formaAlterada, setFormaAlterada] = useState(false)

  const empresaDelivery = empresaDeliveryQuery.data
  const raios = raiosQuery.data ?? []
  const areas = areasQuery.data ?? []
  const origemGeo = geoQuery.data?.enderecoLocalizacao ?? null
  const geoConfigurada = origemGeo != null
  const temCoberturaAtiva = temCoberturaEntregaAtiva(raios, areas)
  const areaFormaEditando = useMemo(
    () => areas.find(a => a.id === areaFormaEditandoId) ?? null,
    [areas, areaFormaEditandoId]
  )
  const salvando =
    criarRaioMutation.isPending ||
    atualizarRaioMutation.isPending ||
    excluirRaioMutation.isPending ||
    criarAreaMutation.isPending ||
    atualizarAreaMutation.isPending ||
    excluirAreaMutation.isPending

  const alertas = useMemo(() => {
    const items: { titulo: string; descricao: string; href?: string; label?: string }[] = []
    if (!empresaDelivery) {
      items.push({
        titulo: 'Delivery não configurado',
        descricao: 'Ative a loja online na aba Delivery antes de definir a cobertura.',
        href: configuracoesTabPath('empresa-delivery'),
        label: 'Ir para Delivery',
      })
    }
    if (empresaDelivery && !geoConfigurada && !geoQuery.isPending) {
      items.push({
        titulo: 'Geolocalização da loja pendente',
        descricao:
          'Raios e áreas usam o endereço da empresa como referência. Configure o pin no mapa na aba Empresa.',
        href: `${configuracoesTabPath('empresa')}#geolocalizacao-empresa`,
        label: 'Configurar geolocalização',
      })
    }
    if (
      empresaDelivery &&
      geoConfigurada &&
      !temCoberturaAtiva &&
      !raiosQuery.isPending &&
      !areasQuery.isPending
    ) {
      items.push({
        titulo: 'Nenhuma cobertura de entrega ativa',
        descricao:
          'Sem raios ou áreas ativas, o checkout público não consegue cotar frete. Cadastre ao menos uma opção.',
      })
    }
    return items
  }, [
    empresaDelivery,
    geoConfigurada,
    geoQuery.isPending,
    raiosQuery.isPending,
    areasQuery.isPending,
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
    setModoDesenho(false)
  }, [])

  const ocultarMapa = useCallback(() => {
    limparRascunhoArea()
    limparEdicaoForma()
    setMapaVisivel(false)
  }, [limparEdicaoForma, limparRascunhoArea])

  const abrirNovoRaio = useCallback(() => {
    limparEdicaoForma()
    limparRascunhoArea()
    setMapaVisivel(true)
    setRaioEditando(null)
    setModalRaioAberto(true)
  }, [limparEdicaoForma, limparRascunhoArea])

  const abrirEditarRaio = useCallback((raio: RaioEntregaDTO) => {
    setRaioEditando(raio)
    setModalRaioAberto(true)
  }, [])

  const iniciarDesenhoArea = useCallback(() => {
    limparEdicaoForma()
    limparRascunhoArea()
    setAreaEditando(null)
    setMapaVisivel(true)
    setModoDesenho(true)
  }, [limparEdicaoForma, limparRascunhoArea])

  const iniciarEdicaoFormaArea = useCallback(
    (areaId: string) => {
      limparRascunhoArea()
      setMapaVisivel(true)
      setAreaFormaEditandoId(areaId)
      setFormaPathsRascunho(null)
      setFormaAlterada(false)
    },
    [limparRascunhoArea]
  )

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

  const abrirEditarArea = useCallback(
    (area: AreaEntregaDTO) => {
      limparRascunhoArea()
      limparEdicaoForma()
      setAreaEditando(area)
      setModalAreaAberto(true)
    },
    [limparEdicaoForma, limparRascunhoArea]
  )

  const handlePoligonoDesenhado = useCallback((paths: LatLngLiteral[]) => {
    try {
      const geometria = latLngPathsToGeoJsonPolygon(paths)
      setGeometriaRascunho(geometria)
      setRascunhoPaths(paths)
      setModoDesenho(false)
      setAreaEditando(null)
      setModalAreaAberto(true)
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Polígono inválido')
      setModoDesenho(true)
    }
  }, [])

  const handleSubmitModalRaio = useCallback(
    async (values: RaioEntregaFormValues) => {
      try {
        if (raioEditando) {
          await atualizarRaioMutation.mutateAsync({
            id: raioEditando.id,
            input: raioEntregaFormToUpdateInput(values),
          })
          showToast.success('Raio de entrega atualizado.')
        } else {
          await criarRaioMutation.mutateAsync(raioEntregaFormToCreateInput(values))
          showToast.success('Raio de entrega criado.')
        }
        setModalRaioAberto(false)
        setRaioEditando(null)
        await raiosQuery.refetch()
      } catch (error) {
        showToast.error(error instanceof Error ? error.message : 'Não foi possível salvar o raio.')
      }
    },
    [atualizarRaioMutation, criarRaioMutation, raioEditando, raiosQuery]
  )

  const handleSubmitModalArea = useCallback(
    async (values: AreaEntregaFormValues) => {
      try {
        if (areaEditando) {
          await atualizarAreaMutation.mutateAsync({
            id: areaEditando.id,
            input: areaEntregaFormToUpdateInput(values),
          })
          showToast.success('Área de entrega atualizada.')
        } else {
          if (!geometriaRascunho) {
            showToast.error('Desenhe a área no mapa antes de salvar.')
            return
          }
          await criarAreaMutation.mutateAsync(
            areaEntregaFormToCreateInput(values, geometriaRascunho)
          )
          showToast.success('Área de entrega criada.')
        }
        setModalAreaAberto(false)
        setAreaEditando(null)
        limparRascunhoArea()
      } catch (error) {
        showToast.error(mensagemErroArea(error))
      }
    },
    [
      areaEditando,
      atualizarAreaMutation,
      criarAreaMutation,
      geometriaRascunho,
      limparRascunhoArea,
    ]
  )

  const handleToggleRaioAtivo = useCallback(
    async (raio: RaioEntregaDTO, ativo: boolean) => {
      try {
        await atualizarRaioMutation.mutateAsync({ id: raio.id, input: { ativo } })
        showToast.success(ativo ? 'Raio ativado.' : 'Raio desativado.')
      } catch (error) {
        showToast.error(error instanceof Error ? error.message : 'Não foi possível alterar o raio.')
      }
    },
    [atualizarRaioMutation]
  )

  const handleToggleAreaAtivo = useCallback(
    async (area: AreaEntregaDTO, ativo: boolean) => {
      try {
        await atualizarAreaMutation.mutateAsync({ id: area.id, input: { ativo } })
        showToast.success(ativo ? 'Área ativada.' : 'Área desativada.')
      } catch (error) {
        showToast.error(error instanceof Error ? error.message : 'Não foi possível alterar a área.')
      }
    },
    [atualizarAreaMutation]
  )

  const handleConfirmarExclusaoRaio = useCallback(async () => {
    if (!raioExcluindo) return
    try {
      await excluirRaioMutation.mutateAsync(raioExcluindo.id)
      showToast.success('Raio excluído.')
      setRaioExcluindo(null)
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Não foi possível excluir o raio.')
    }
  }, [excluirRaioMutation, raioExcluindo])

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

  const handleFecharModalArea = useCallback(
    (open: boolean) => {
      setModalAreaAberto(open)
      if (!open) {
        setAreaEditando(null)
        if (!areaEditando) limparRascunhoArea()
      }
    },
    [areaEditando, limparRascunhoArea]
  )

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

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 md:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
            <MdRadar className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary-text">Cobertura Delivery</h1>
            <p className="mt-1 text-sm text-secondary-text">
              Defina raios por distância ou desenhe áreas no mapa. Endereços dentro de uma cobertura
              ativa recebem cotação de frete no checkout público — áreas têm prioridade sobre raios.
            </p>
          </div>
        </div>

        {alertas.length > 0 ? (
          <div className="space-y-3">
            {alertas.map(alerta => (
              <section
                key={alerta.titulo}
                role="alert"
                className="rounded-xl border border-alternate/40 bg-alternate/10 p-4 text-alternate"
              >
                <p className="text-sm font-semibold">{alerta.titulo}</p>
                <p className="mt-1 text-xs text-alternate/80">{alerta.descricao}</p>
                {alerta.href && alerta.label ? (
                  <Link
                    href={alerta.href}
                    className="mt-2 inline-block text-xs font-semibold text-secondary underline-offset-2 hover:underline"
                  >
                    {alerta.label}
                  </Link>
                ) : null}
              </section>
            ))}
          </div>
        ) : null}

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-primary-text">Cobertura no mapa</h2>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-secondary-text">
                <MdMyLocation className="h-3.5 w-3.5" aria-hidden />
                Origem: endereço geolocalizado da empresa
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {mapaVisivel ? (
                <button
                  type="button"
                  onClick={ocultarMapa}
                  disabled={salvando || modoDesenho}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-secondary-text hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <MdVisibilityOff className="h-4 w-4" aria-hidden />
                  Ocultar mapa
                </button>
              ) : null}
              <button
                type="button"
                onClick={iniciarDesenhoArea}
                disabled={!empresaDelivery || !geoConfigurada || salvando || modoDesenho}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary bg-white px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MdDraw className="h-4 w-4" aria-hidden />
                Desenhar área
              </button>
              <button
                type="button"
                onClick={abrirNovoRaio}
                disabled={!empresaDelivery || !geoConfigurada || salvando}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MdAdd className="h-4 w-4" aria-hidden />
                Novo raio
              </button>
            </div>
          </div>

          {areaFormaEditandoId ? (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-secondary/30 bg-secondary/5 px-3 py-2">
              <p className="text-xs text-secondary-text">
                Editando forma
                {areaFormaEditando?.nome?.trim()
                  ? ` de “${areaFormaEditando.nome.trim()}”`
                  : ''}
                . Arraste os pontos no mapa
                {formaAlterada ? ' e salve as alterações.' : '.'}
              </p>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={limparEdicaoForma}
                  disabled={salvando}
                  className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-secondary-text hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void handleSalvarFormaArea()}
                  disabled={salvando || !formaAlterada || !formaPathsRascunho}
                  className="rounded-md bg-secondary px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Salvar forma
                </button>
              </div>
            </div>
          ) : null}

          <div className="grid min-h-[560px] grid-cols-1 items-stretch gap-4 lg:h-[min(70vh,640px)] lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(300px,400px)]">
            {/* Slot do mapa: sempre ocupa a altura da coluna */}
            <div className="relative min-h-[320px] overflow-hidden rounded-lg border border-gray-200 bg-gray-50 lg:min-h-0">
              {!mapaVisivel ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                  <MdMap className="h-10 w-10 text-secondary-text/40" aria-hidden />
                 
                  <p className="max-w-sm text-xs text-secondary-text/80">
                    Use &quot;Exibir mapa&quot; para visualizar ou editar formas, ou &quot;Desenhar
                    área&quot; / &quot;Novo raio&quot; para criar cobertura.
                  </p>
                  <button
                    type="button"
                    onClick={() => setMapaVisivel(true)}
                    disabled={!empresaDelivery || !geoConfigurada}
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
                    key="cobertura-delivery-map"
                    origem={origemGeo}
                    raios={raios}
                    areas={areas}
                    modoDesenho={modoDesenho}
                    rascunhoPaths={rascunhoPaths}
                    areaDestacadaId={areaFormaEditandoId ?? areaEditando?.id ?? null}
                    areaFormaEditandoId={areaFormaEditandoId}
                    onPoligonoDesenhado={handlePoligonoDesenhado}
                    onDesenhoCancelado={limparRascunhoArea}
                    onSelecionarAreaParaEditar={iniciarEdicaoFormaArea}
                    onFormaAreaAlterada={handleFormaAreaAlterada}
                  />
                </div>
              )}
            </div>

            {/* Painel lateral: áreas + raios */}
            <div className="flex min-h-[320px] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white lg:min-h-0">
              <div className="flex min-h-0 flex-1 flex-col border-b border-gray-100">
                <div className="shrink-0 border-b border-gray-100 px-3 py-2.5">
                  <h3 className="text-sm font-semibold text-primary-text">Áreas desenhadas</h3>
                  <p className="text-[11px] leading-snug text-secondary-text">
                    Na cotação, a área ativa que contém o endereço tem prioridade sobre raios.
                  </p>
                </div>
                <div className="min-h-0 flex-1 overflow-auto">
                  {areasQuery.isPending ? (
                    <div className="flex justify-center p-6">
                      <JiffyLoading />
                    </div>
                  ) : areas.length === 0 ? (
                    <p className="p-4 text-center text-xs text-secondary-text">
                      Nenhuma área. Use &quot;Desenhar área&quot; para criar.
                    </p>
                  ) : (
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 bg-gray-50">
                        <tr className="border-b border-gray-100 text-[10px] uppercase tracking-wide text-secondary-text">
                          <th className="px-3 py-2 font-semibold">Nome</th>
                          <th className="px-2 py-2 font-semibold">Taxa</th>
                          <th className="px-2 py-2 font-semibold">Ativo</th>
                          <th className="px-2 py-2 text-right font-semibold">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {areas.map(area => (
                          <tr key={area.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                            <td className="max-w-[7rem] truncate px-3 py-2 font-medium text-primary-text">
                              <span title={area.nome?.trim() || undefined}>
                                {area.nome?.trim() || '—'}
                              </span>
                              <span className="mt-0.5 block text-[10px] font-normal text-secondary-text">
                                {area.tempoEntregaInMinutes} min
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-2 py-2 text-xs text-secondary-text">
                              {formatValorTaxaRaio(area.valorTaxa)}
                            </td>
                            <td className="px-2 py-2">
                              <JiffyIconSwitch
                                checked={area.ativo}
                                onChange={e => void handleToggleAreaAtivo(area, e.target.checked)}
                                disabled={salvando}
                                size="xs"
                                inputProps={{
                                  'aria-label': `Ativar área ${area.nome ?? area.id}`,
                                }}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <div className="flex justify-end gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => iniciarEdicaoFormaArea(area.id)}
                                  disabled={salvando || modoDesenho}
                                  className="rounded-lg p-1.5 text-secondary-text hover:bg-gray-100 hover:text-primary"
                                  aria-label="Editar forma no mapa"
                                  title="Editar forma no mapa"
                                >
                                  <MdMap className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => abrirEditarArea(area)}
                                  disabled={salvando}
                                  className="rounded-lg p-1.5 text-secondary-text hover:bg-gray-100 hover:text-primary"
                                  aria-label="Editar área"
                                  title="Editar taxa e dados"
                                >
                                  <MdEdit className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAreaExcluindo(area)}
                                  disabled={salvando}
                                  className="rounded-lg p-1.5 text-secondary-text hover:bg-red-50 hover:text-red-600"
                                  aria-label="Excluir área"
                                >
                                  <MdDeleteOutline className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col">
                <div className="shrink-0 border-b border-gray-100 px-3 py-2.5">
                  <h3 className="text-sm font-semibold text-primary-text">Raios cadastrados</h3>
                  <p className="text-[11px] leading-snug text-secondary-text">
                    Em sobreposição, prevalece o raio de menor distância que ainda cobre o
                    endereço.
                  </p>
                </div>
                <div className="min-h-0 flex-1 overflow-auto">
                  {raiosQuery.isPending ? (
                    <div className="flex justify-center p-6">
                      <JiffyLoading />
                    </div>
                  ) : raios.length === 0 ? (
                    <p className="p-4 text-center text-xs text-secondary-text">
                      Nenhum raio. Use &quot;Novo raio&quot; para criar.
                    </p>
                  ) : (
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 bg-gray-50">
                        <tr className="border-b border-gray-100 text-[10px] uppercase tracking-wide text-secondary-text">
                          <th className="px-3 py-2 font-semibold">Nome</th>
                          <th className="px-2 py-2 font-semibold">Dist.</th>
                          <th className="px-2 py-2 font-semibold">Ativo</th>
                          <th className="px-2 py-2 text-right font-semibold">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {raios.map(raio => (
                          <tr key={raio.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                            <td className="max-w-[7rem] truncate px-3 py-2 font-medium text-primary-text">
                              <span title={raio.nome?.trim() || undefined}>
                                {raio.nome?.trim() || '—'}
                              </span>
                              <span className="mt-0.5 block text-[10px] font-normal text-secondary-text">
                                {formatValorTaxaRaio(raio.valorTaxa)} · {raio.tempoEntregaInMinutes}{' '}
                                min
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-2 py-2 text-xs text-secondary-text">
                              {formatDistanciaRaio(raio.distanciaMaximaEmMetros)}
                            </td>
                            <td className="px-2 py-2">
                              <JiffyIconSwitch
                                checked={raio.ativo}
                                onChange={e => void handleToggleRaioAtivo(raio, e.target.checked)}
                                disabled={salvando}
                                size="xs"
                                inputProps={{
                                  'aria-label': `Ativar raio ${raio.nome ?? raio.id}`,
                                }}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <div className="flex justify-end gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => abrirEditarRaio(raio)}
                                  disabled={salvando}
                                  className="rounded-lg p-1.5 text-secondary-text hover:bg-gray-100 hover:text-primary"
                                  aria-label="Editar raio"
                                >
                                  <MdEdit className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRaioExcluindo(raio)}
                                  disabled={salvando}
                                  className="rounded-lg p-1.5 text-secondary-text hover:bg-red-50 hover:text-red-600"
                                  aria-label="Excluir raio"
                                >
                                  <MdDeleteOutline className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <RaioEntregaFormModal
        open={modalRaioAberto}
        onOpenChange={setModalRaioAberto}
        raio={raioEditando}
        salvando={criarRaioMutation.isPending || atualizarRaioMutation.isPending}
        onSubmit={handleSubmitModalRaio}
      />

      <AreaEntregaFormModal
        open={modalAreaAberto}
        onOpenChange={handleFecharModalArea}
        area={areaEditando}
        salvando={criarAreaMutation.isPending || atualizarAreaMutation.isPending}
        onSubmit={handleSubmitModalArea}
      />

      <Dialog open={raioExcluindo != null} onOpenChange={open => !open && setRaioExcluindo(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir raio de entrega?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-secondary-text">
            O raio{' '}
            <span className="font-semibold text-primary-text">
              {raioExcluindo?.nome?.trim() ||
                formatDistanciaRaio(raioExcluindo?.distanciaMaximaEmMetros ?? 0)}
            </span>{' '}
            será removido. Endereços que dependiam dele podem deixar de receber cotação.
          </p>
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setRaioExcluindo(null)}
              disabled={excluirRaioMutation.isPending}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-secondary-text"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmarExclusaoRaio()}
              disabled={excluirRaioMutation.isPending}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {excluirRaioMutation.isPending ? 'Excluindo…' : 'Excluir'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
