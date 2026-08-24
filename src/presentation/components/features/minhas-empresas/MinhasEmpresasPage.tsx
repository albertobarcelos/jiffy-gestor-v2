'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import type { LoginEmpresaSnapshot } from '@/src/domain/types/LoginEmpresaSnapshot'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { prepareTabSession } from '@/src/shared/utils/tabSession'
import { fetchAccessTokenEscolherEmpresa } from '@/src/presentation/utils/escolherEmpresaApi'
import type { ConvitePendente } from '@/src/presentation/components/features/convites/types'
import { useRegisterHubSearch } from '@/src/presentation/contexts/HubSearchContext'
import { MinhasEmpresasFeedGrid } from './components/MinhasEmpresasFeedGrid'
import { MINHAS_EMPRESAS_GRID_PREVIEW_LIMIT, type MinhasEmpresasFeedItem } from './types'
import { buildMinhasEmpresasGridCells } from './utils/buildMinhasEmpresasGridCells'
import { MinhasEmpresasFeedList } from './components/MinhasEmpresasFeedList'
import {
  ViewControls,
  type MinhasEmpresasFeedFiltro,
  type MinhasEmpresasViewMode,
} from './components/ViewControls'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { empresaParaMinhasEmpresas } from './utils/empresaParaMinhasEmpresas'
import { conviteParaEmpresaSnapshot } from '@/src/presentation/components/features/convites/utils/conviteParaEmpresaSnapshot'
import {
  HUB_SESSAO_TOKEN_MENSAGEM,
  isLikelyHubSessionTokenError,
  isLikelyVinculoRemovidoError,
} from './utils/hubSessionTokenFeedback'
import { appEmpresaCorrespondeBusca, conviteCorrespondeBusca } from './utils/minhasEmpresasBusca'
import { activateHubEmpresaSessionAndBuildUrl } from './utils/activateHubEmpresaSession'
import { HUB_ROUTES } from '@/src/shared/constants/hubRoutes'
import { ensureHubBearerToken } from '@/src/presentation/utils/ensureHubBearerToken'
import { resolverDestinoPosLoginUseCase } from '@/src/application/use-cases/superficie/ResolverDestinoPosLoginUseCase'
import { montarContextoAcessoSuperficie } from '@/src/presentation/gestor-pedidos/superficie/montarContextoAcessoSuperficie'
import { buildGestaoPath } from '@/src/shared/utils/gestaoRoutes'
import { entrarEmpresaGestorNaAba } from '@/src/presentation/gestor-pedidos/sessao/entrarEmpresaGestorNaAba'
import { isSinalKioskGestorPedidos } from '@/src/presentation/gestor-pedidos/kiosk/isKioskGestorPedidos'
import {
  lerSinalGestorDoBrowser,
  urlLoginDaSessaoAtual,
} from '@/src/presentation/gestor-pedidos/sessao/pathsGestorSessao'
import { planearDestinoAposLogin } from '@/src/presentation/gestor-pedidos/sessao/planearDestinoAposLogin'

const HUB_SESSAO_TOAST_ID = 'minhas-empresas-sessao-token'

export default function MinhasEmpresasPage() {
  const router = useRouter()
  const hubEmpresas = useAuthStore(s => s.hubEmpresas)
  const setHubEmpresas = useAuthStore(s => s.setHubEmpresas)
  /** Sessão do hub (identidade); não usar `auth` aqui — pode ser só tenant se outra aba abriu empresa. */
  const identityAuth = useAuthStore(s => s.identityAuth)
  const logout = useAuthStore(s => s.logout)
  const isRehydrated = useAuthStore(s => s.isRehydrated)

  const [busca, setBusca] = useState('')
  /** Bearer resolvido (identity ou access via refresh) — fonte única das APIs do hub. */
  const [hubBearer, setHubBearer] = useState<string | null>(null)
  const [hubBearerReady, setHubBearerReady] = useState(false)

  useRegisterHubSearch({
    value: busca,
    onChange: setBusca,
    placeholder: 'Buscar por nome ou CNPJ',
  })
  const [viewMode, setViewMode] = useState<MinhasEmpresasViewMode>('grid')
  const [feedFiltro, setFeedFiltro] = useState<MinhasEmpresasFeedFiltro>('tudo')
  const [busyAppId, setBusyAppId] = useState<string | null>(null)
  const [acessoErro, setAcessoErro] = useState<string | null>(null)
  /** Sessão/token inválido: banner fixo no topo + toast (id único evita spam ao clicar várias vezes). */
  const [hubTokenBanner, setHubTokenBanner] = useState<string | null>(null)

  const [convites, setConvites] = useState<ConvitePendente[] | null>(null)
  const [convitesErro, setConvitesErro] = useState<string | null>(null)
  const [loadingConviteById, setLoadingConviteById] = useState<
    Record<string, 'aceitar' | 'recusar' | null>
  >({})

  /** No grid, primeira linha pode incluir card promocional; “Mostrar mais” expande o feed completo. */
  const [feedGridExpandido, setFeedGridExpandido] = useState(false)

  const hubSessaoProativaDisparadaRef = useRef(false)
  const redirectTimerRef = useRef<number | undefined>(undefined)
  const hubEmpresasRefetchDoneRef = useRef(false)
  const autoEnterGestorRef = useRef(false)

  const irParaLogin = useCallback(() => {
    void logout().finally(() => {
      window.location.href = urlLoginDaSessaoAtual()
    })
  }, [logout])

  /**
   * Sessão inválida: banner + toast; logout só após delay e nova checagem do Bearer
   * (evita corrida com refresh/access e o flash “Usuário” / lista vazia).
   */
  const reportHubSessionIssue = useCallback(
    (message: string) => {
      setHubTokenBanner(message)
      toast.error(message, { id: HUB_SESSAO_TOAST_ID, duration: 8000 })

      if (hubSessaoProativaDisparadaRef.current) {
        return
      }
      hubSessaoProativaDisparadaRef.current = true

      if (redirectTimerRef.current !== undefined) {
        window.clearTimeout(redirectTimerRef.current)
      }

      redirectTimerRef.current = window.setTimeout(() => {
        void (async () => {
          const retry = await ensureHubBearerToken()
          if (retry) {
            setHubBearer(retry.token)
            setHubBearerReady(true)
            setHubTokenBanner(null)
            hubSessaoProativaDisparadaRef.current = false
            toast.dismiss(HUB_SESSAO_TOAST_ID)
            return
          }
          irParaLogin()
        })()
      }, 3000)
    },
    [irParaLogin]
  )

  /**
   * Bootstrap hub: identity → cookie → access da aba → refresh.
   * Aceita identity **ou** access (docs FLUXO_VOLTAR_AO_MEU_JIFFY) — identity JWT é curto;
   * rejeitar access causava logout em loop, header “Usuário” piscando e lista vazia.
   */
  useEffect(() => {
    if (!isRehydrated) {
      return
    }
    let cancelado = false
    void (async () => {
      const bearer = await ensureHubBearerToken()
      if (cancelado) {
        return
      }
      if (!bearer) {
        setHubBearer(null)
        setHubBearerReady(true)
        reportHubSessionIssue(HUB_SESSAO_TOKEN_MENSAGEM)
        return
      }
      setHubBearer(bearer.token)
      setHubBearerReady(true)
      setHubTokenBanner(null)
      hubSessaoProativaDisparadaRef.current = false
    })()
    return () => {
      cancelado = true
      if (redirectTimerRef.current !== undefined) {
        window.clearTimeout(redirectTimerRef.current)
        redirectTimerRef.current = undefined
      }
    }
  }, [isRehydrated, identityAuth, reportHubSessionIssue])

  /** Se a lista do login sumiu, recupera empresas via refresh-map / Bearer atual. */
  useEffect(() => {
    if (!isRehydrated || !hubBearerReady || !hubBearer) {
      return
    }
    if (hubEmpresas !== null) {
      hubEmpresasRefetchDoneRef.current = false
      return
    }
    if (hubEmpresasRefetchDoneRef.current) {
      return
    }
    hubEmpresasRefetchDoneRef.current = true

    let cancelado = false
    void (async () => {
      try {
        const res = await fetch('/api/auth/hub-empresas', {
          method: 'GET',
          credentials: 'include',
          headers: { Authorization: `Bearer ${hubBearer}` },
        })
        if (!res.ok || cancelado) {
          return
        }
        const data = (await res.json().catch(() => null)) as {
          empresas?: LoginEmpresaSnapshot[]
        } | null
        const lista = Array.isArray(data?.empresas) ? data.empresas : []
        if (!cancelado && lista.length > 0) {
          setHubEmpresas(lista)
        }
      } catch (e) {
        console.error('[MinhasEmpresas] refetch hub-empresas:', e)
      }
    })()

    return () => {
      cancelado = true
    }
  }, [isRehydrated, hubBearerReady, hubBearer, hubEmpresas, setHubEmpresas])

  useEffect(() => {
    if (!isRehydrated || !hubBearerReady || !hubBearer) {
      return
    }

    let cancelado = false

    void (async () => {
      try {
        setConvitesErro(null)
        const res = await fetch('/api/convites/me', {
          method: 'GET',
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${hubBearer}`,
          },
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          const msg =
            data && typeof data === 'object' && data !== null && 'error' in data
              ? String((data as { error?: unknown }).error)
              : `Erro ${res.status}`
          throw new Error(msg)
        }
        if (!cancelado) {
          setConvites(Array.isArray(data) ? (data as ConvitePendente[]) : [])
          setHubTokenBanner(null)
          hubSessaoProativaDisparadaRef.current = false
        }
      } catch (e) {
        if (!cancelado) {
          const msg = e instanceof Error ? e.message : 'Erro ao carregar convites'
          if (isLikelyHubSessionTokenError(msg)) {
            reportHubSessionIssue(msg)
            setConvitesErro(null)
          } else {
            setConvitesErro(msg)
          }
          setConvites([])
        }
      }
    })()

    return () => {
      cancelado = true
    }
  }, [hubBearer, hubBearerReady, isRehydrated, reportHubSessionIssue])

  const setConviteLoading = useCallback((id: string, action: 'aceitar' | 'recusar' | null) => {
    setLoadingConviteById(prev => ({ ...prev, [id]: action }))
  }, [])

  const mergeEmpresaAceita = useCallback(
    (convite: ConvitePendente) => {
      const novo = conviteParaEmpresaSnapshot(convite)
      const atual = hubEmpresas ?? []
      if (atual.some(e => e.id === novo.id)) {
        return
      }
      setHubEmpresas([...atual, novo])
    },
    [hubEmpresas, setHubEmpresas]
  )

  const handleAceitarConvite = useCallback(
    async (id: string) => {
      const token = hubBearer
      const conviteSnapshot = convites?.find(c => c.id === id)
      setConviteLoading(id, 'aceitar')
      try {
        const res = await fetch(`/api/convites/me/${encodeURIComponent(id)}/aceitar`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          const msg =
            data && typeof data === 'object' && data !== null && 'error' in data
              ? String((data as { error?: unknown }).error)
              : `Erro ${res.status}`
          throw new Error(msg)
        }
        if (conviteSnapshot) {
          mergeEmpresaAceita(conviteSnapshot)
        }
        setConvites(prev => (prev ? prev.filter(c => c.id !== id) : prev))
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro ao aceitar convite'
        if (isLikelyHubSessionTokenError(msg)) {
          reportHubSessionIssue(msg)
          setConvitesErro(null)
        } else {
          setConvitesErro(msg)
        }
      } finally {
        setConviteLoading(id, null)
      }
    },
    [hubBearer, convites, mergeEmpresaAceita, reportHubSessionIssue, setConviteLoading]
  )

  const handleRecusarConvite = useCallback(
    async (id: string) => {
      const token = hubBearer
      setConviteLoading(id, 'recusar')
      try {
        const res = await fetch(`/api/convites/me/${encodeURIComponent(id)}/recusar`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          const msg =
            data && typeof data === 'object' && data !== null && 'error' in data
              ? String((data as { error?: unknown }).error)
              : `Erro ${res.status}`
          throw new Error(msg)
        }
        setConvites(prev => (prev ? prev.filter(c => c.id !== id) : prev))
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro ao recusar convite'
        if (isLikelyHubSessionTokenError(msg)) {
          reportHubSessionIssue(msg)
          setConvitesErro(null)
        } else {
          setConvitesErro(msg)
        }
      } finally {
        setConviteLoading(id, null)
      }
    },
    [hubBearer, reportHubSessionIssue, setConviteLoading]
  )

  const appsBase = useMemo(
    () => (hubEmpresas ?? []).map(empresaParaMinhasEmpresas),
    [hubEmpresas]
  )

  const appsFiltrados = useMemo(() => {
    if (!busca.trim()) {
      return appsBase
    }
    return appsBase.filter(a => appEmpresaCorrespondeBusca(a, busca))
  }, [busca, appsBase])

  const convitesCarregadosFlag = convites !== null

  /** Convites filtrados pela busca (nome da empresa ou e-mail); só após GET /convites/me. */
  const convitesFiltrados = useMemo(() => {
    if (!convitesCarregadosFlag || !convites?.length) {
      return []
    }
    if (!busca.trim()) {
      return convites
    }
    return convites.filter(c => conviteCorrespondeBusca(c, busca))
  }, [convitesCarregadosFlag, convites, busca])

  /** Convites primeiro; depois empresas — ou só um tipo conforme `feedFiltro`. */
  const feedItems = useMemo((): MinhasEmpresasFeedItem[] => {
    const conv: MinhasEmpresasFeedItem[] = convitesFiltrados.map(c => ({
      kind: 'convite',
      convite: c,
    }))
    const emp: MinhasEmpresasFeedItem[] = appsFiltrados.map(a => ({
      kind: 'empresa',
      app: a,
    }))
    if (feedFiltro === 'convites') {
      return conv
    }
    if (feedFiltro === 'empresas') {
      return emp
    }
    return [...conv, ...emp]
  }, [convitesFiltrados, appsFiltrados, feedFiltro])

  const conviteFeedItems = useMemo(
    () => feedItems.filter((item): item is Extract<MinhasEmpresasFeedItem, { kind: 'convite' }> => item.kind === 'convite'),
    [feedItems]
  )

  const empresaFeedItems = useMemo(
    () => feedItems.filter((item): item is Extract<MinhasEmpresasFeedItem, { kind: 'empresa' }> => item.kind === 'empresa'),
    [feedItems]
  )

  /** Grade resumida: até 15 itens do feed (convites + empresas); busca ativa expande para todos os resultados. */
  const buscaAtiva = Boolean(busca.trim())
  const gridExpandidoEfetivo = feedGridExpandido || buscaAtiva

  const feedItemsParaGrid = useMemo(
    () => (gridExpandidoEfetivo ? feedItems : feedItems.slice(0, MINHAS_EMPRESAS_GRID_PREVIEW_LIMIT)),
    [feedItems, gridExpandidoEfetivo]
  )

  const conviteFeedItemsGrid = useMemo(
    () =>
      feedItemsParaGrid.filter(
        (item): item is Extract<MinhasEmpresasFeedItem, { kind: 'convite' }> => item.kind === 'convite'
      ),
    [feedItemsParaGrid]
  )

  const empresaFeedItemsGrid = useMemo(
    () =>
      feedItemsParaGrid.filter(
        (item): item is Extract<MinhasEmpresasFeedItem, { kind: 'empresa' }> => item.kind === 'empresa'
      ),
    [feedItemsParaGrid]
  )

  const gridEmpresaCells = useMemo(
    () => buildMinhasEmpresasGridCells(empresaFeedItemsGrid, { expandido: true }),
    [empresaFeedItemsGrid]
  )

  /** Nova busca ou troca de filtro volta ao preview do grid (15 itens). */
  useEffect(() => {
    setFeedGridExpandido(false)
  }, [busca, feedFiltro])

  /** Mesmo fluxo que “Acessar”: POST escolher-empresa com Bearer do hub (identity ou access). */
  const obterTokenEmpresa = useCallback(
    async (appId: string): Promise<string> => {
      const bearer = hubBearer ?? (await ensureHubBearerToken())?.token ?? null
      return fetchAccessTokenEscolherEmpresa(appId, bearer)
    },
    [hubBearer]
  )

  const removerEmpresaDesvinculada = useCallback(
    (appId: string) => {
      const atual = hubEmpresas ?? []
      const atualizado = atual.filter(e => e.id !== appId)
      setHubEmpresas(atualizado)
      toast.error('Seu vínculo com esta empresa foi removido.', { duration: 5000 })
    },
    [hubEmpresas, setHubEmpresas]
  )

  const reportErroAcessoEmpresa = useCallback(
    (e: unknown, appId?: string) => {
      const msg =
        e instanceof Error ? e.message : 'Não foi possível abrir o aplicativo'

      if (appId && isLikelyVinculoRemovidoError(msg)) {
        removerEmpresaDesvinculada(appId)
        return
      }

      if (isLikelyHubSessionTokenError(msg)) {
        reportHubSessionIssue(msg)
        setAcessoErro(null)
      } else {
        setAcessoErro(msg)
      }
    },
    [reportHubSessionIssue, removerEmpresaDesvinculada]
  )

  const handleAcessar = useCallback(
    async (appId: string) => {
      const app = appsBase.find(a => a.id === appId)
      if (app?.status === 'inativo') {
        return
      }

      setAcessoErro(null)
      setBusyAppId(appId)

      try {
        const token = await obterTokenEmpresa(appId)
        if (isSinalKioskGestorPedidos(lerSinalGestorDoBrowser())) {
          router.replace(
            entrarEmpresaGestorNaAba({
              accessToken: token,
              empresaNome: app?.nome ?? '',
              empresaId: appId,
            })
          )
          return
        }
        const empParam = prepareTabSession(token, app?.nome ?? '', appId)
        const destino = resolverDestinoPosLoginUseCase.execute(montarContextoAcessoSuperficie(token))
        window.open(buildGestaoPath(empParam, destino.pathModulo), '_blank')
      } catch (e) {
        reportErroAcessoEmpresa(e, appId)
      } finally {
        setBusyAppId(null)
      }
    },
    [appsBase, obterTokenEmpresa, reportErroAcessoEmpresa, router]
  )

  useEffect(() => {
    if (!isRehydrated || !hubBearerReady || autoEnterGestorRef.current || busyAppId) {
      return
    }
    const plano = planearDestinoAposLogin({
      empresas: hubEmpresas,
      sinalGestor: lerSinalGestorDoBrowser(),
    })
    if (plano.tipo !== 'pedidos-gestor') {
      return
    }
    autoEnterGestorRef.current = true
    void handleAcessar(plano.empresa.id)
  }, [busyAppId, handleAcessar, hubBearerReady, hubEmpresas, isRehydrated])

  const handleGerenciarConvites = async (appId: string) => {
    const app = appsBase.find(a => a.id === appId)
    if (!app || app.status === 'inativo') {
      return
    }

    setAcessoErro(null)

    try {
      const token = await obterTokenEmpresa(appId)
      const url = activateHubEmpresaSessionAndBuildUrl(
        token,
        app.nome,
        appId,
        HUB_ROUTES.gerenciarUsuarios
      )
      router.push(url)
    } catch (e) {
      reportErroAcessoEmpresa(e, appId)
    }
  }

  const handleGerenciarPerfisGestor = async (appId: string) => {
    const app = appsBase.find(a => a.id === appId)
    if (!app || app.status === 'inativo') {
      return
    }

    setAcessoErro(null)

    try {
      const token = await obterTokenEmpresa(appId)
      const url = activateHubEmpresaSessionAndBuildUrl(
        token,
        app.nome,
        appId,
        HUB_ROUTES.perfisGestor
      )
      router.push(url)
    } catch (e) {
      reportErroAcessoEmpresa(e, appId)
    }
  }

  const convitesCarregados = convitesCarregadosFlag
  const temEmpresas = appsBase.length > 0
  const temConvitesLista = (convites?.length ?? 0) > 0
  const feedVazio = feedItems.length === 0

  const mensagemFeedVazioTitulo = useMemo(() => {
    if (busca.trim()) {
      return 'Nenhum resultado para a busca.'
    }
    if (feedFiltro === 'convites') {
      return 'Nenhum convite pendente.'
    }
    if (feedFiltro === 'empresas') {
      return 'Nenhuma empresa vinculada à sua conta.'
    }
    return 'Nenhum aplicativo ou convite nesta lista.'
  }, [busca, feedFiltro])

  const mensagemFeedVazioSubtitulo = useMemo(() => {
    if (busca.trim()) {
      return 'Ajuste o filtro de busca ou tente outro termo.'
    }
    if (!temEmpresas && hubEmpresas === null) {
      return 'Faça login novamente com um usuário gestor para carregar os dados da conta.'
    }
    if (feedFiltro === 'convites' && temEmpresas) {
      return 'Use o filtro (ícone de prédio) para ver só empresas ou volte a exibir tudo (ícone em camadas).'
    }
    if (feedFiltro === 'empresas' && temConvitesLista) {
      return 'Use o filtro (ícone de envelope) para ver só convites ou volte a exibir tudo (ícone em camadas).'
    }
    if (!temEmpresas && !temConvitesLista) {
      return 'Aceite um convite ou aguarde novos vínculos.'
    }
    return 'Ajuste o filtro de busca ou tente outro termo.'
  }, [busca, feedFiltro, temEmpresas, temConvitesLista, hubEmpresas])

  /** Só na grade: preview de até 15 itens (5×3); “Mostrar mais” expande o restante. Busca já expande a grade. */
  const gridPodeResumo =
    convitesCarregados &&
    !feedVazio &&
    viewMode === 'grid' &&
    feedItems.length > MINHAS_EMPRESAS_GRID_PREVIEW_LIMIT &&
    !buscaAtiva

  if (!isRehydrated || !hubBearerReady || !hubBearer) {
    return (
      <div
        className="flex min-h-[40vh] w-full items-center justify-center bg-gray-50"
        role="status"
        aria-live="polite"
        aria-label="Validando sessão"
      >
        <JiffyLoading />
      </div>
    )
  }

  return (
    <div className="min-h-0 w-full bg-gray-50 pb-8">
      <div className="mx-auto w-full max-w-[1400px] px-2 pt-3 md:px-4">
        <header className="mb-4 flex flex-col gap-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl">
                Suas empresas
              </h1>
              <p className="mt-1 text-sm text-gray-600 md:text-base">
                Escolha a empresa que deseja acessar.
              </p>
            </div>
          </div>

          {hubTokenBanner || acessoErro ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {hubTokenBanner ?? acessoErro}
            </div>
          ) : null}

          {convitesErro ? (
            <div
              role="alert"
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              {convitesErro}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <ViewControls
              mode={viewMode}
              onModeChange={setViewMode}
              feedFiltro={feedFiltro}
              onFeedFiltroChange={setFeedFiltro}
            />
          </div>
        </header>

        {!convitesCarregados ? (
          <div
            className="mb-6 flex justify-center py-4"
            role="status"
            aria-live="polite"
            aria-label="Carregando"
          >
            <JiffyLoading />
          </div>
        ) : null}

        {convitesCarregados ? (
          <section aria-label="Aplicativos e convites">
            {feedVazio ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
                <p className="text-sm font-semibold text-gray-900">{mensagemFeedVazioTitulo}</p>
                <p className="mt-2 text-sm text-gray-600">{mensagemFeedVazioSubtitulo}</p>
              </div>
            ) : viewMode === 'grid' ? (
              <MinhasEmpresasFeedGrid
                conviteItems={conviteFeedItemsGrid}
                empresaCells={gridEmpresaCells}
                onAcessar={handleAcessar}
                onGerenciarConvites={handleGerenciarConvites}
                onGerenciarPerfisGestor={handleGerenciarPerfisGestor}
                busyAppId={busyAppId}
                onAceitarConvite={handleAceitarConvite}
                onRecusarConvite={handleRecusarConvite}
                loadingConviteById={loadingConviteById}
              />
            ) : (
              <MinhasEmpresasFeedList
                conviteItems={conviteFeedItems}
                empresaItems={empresaFeedItems}
                onAcessar={handleAcessar}
                onGerenciarConvites={handleGerenciarConvites}
                onGerenciarPerfisGestor={handleGerenciarPerfisGestor}
                busyAppId={busyAppId}
                onAceitarConvite={handleAceitarConvite}
                onRecusarConvite={handleRecusarConvite}
                loadingConviteById={loadingConviteById}
              />
            )}
          </section>
        ) : null}

        {gridPodeResumo ? (
          <div className="mt-6 flex flex-col items-center gap-1">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
              onClick={() => setFeedGridExpandido(e => !e)}
            >
              {feedGridExpandido ? 'Mostrar menos' : 'Mostrar mais'}
            </button>
            {!feedGridExpandido ? (
              <p className="max-w-md text-center text-xs text-gray-500">
                Existem mais convites ou empresas além dos {MINHAS_EMPRESAS_GRID_PREVIEW_LIMIT} primeiros
                desta lista.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
