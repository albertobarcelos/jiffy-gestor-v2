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
import { MeusAppsFeedGrid } from './components/MeusAppsFeedGrid'
import { MEUS_APPS_GRID_PREVIEW_LIMIT, type MeusAppsFeedItem } from './types'
import { buildMeusAppsGridCells } from './utils/buildMeusAppsGridCells'
import { MeusAppsFeedList } from './components/MeusAppsFeedList'
import {
  ViewControls,
  type MeusAppsFeedFiltro,
  type MeusAppsViewMode,
} from './components/ViewControls'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { empresaParaMeusApp } from './utils/empresaParaMeusApp'
import { conviteParaEmpresaSnapshot } from '@/src/presentation/components/features/convites/utils/conviteParaEmpresaSnapshot'
import {
  HUB_SESSAO_TOKEN_MENSAGEM,
  isLikelyHubSessionTokenError,
  isLikelyVinculoRemovidoError,
} from './utils/hubSessionTokenFeedback'
import { appEmpresaCorrespondeBusca, conviteCorrespondeBusca } from './utils/meusAppsBusca'
import { activateHubEmpresaSessionAndBuildUrl } from './utils/activateHubEmpresaSession'

const HUB_SESSAO_TOAST_ID = 'meus-apps-sessao-token'

export default function MeusAppsPage() {
  const router = useRouter()
  const hubEmpresas = useAuthStore(s => s.hubEmpresas)
  const setHubEmpresas = useAuthStore(s => s.setHubEmpresas)
  /** Sessão do hub (identidade); não usar `auth` aqui — pode ser só tenant se outra aba abriu empresa. */
  const identityAuth = useAuthStore(s => s.identityAuth)
  const logoutHub = useAuthStore(s => s.logoutHub)
  const isRehydrated = useAuthStore(s => s.isRehydrated)

  const [busca, setBusca] = useState('')

  useRegisterHubSearch({
    value: busca,
    onChange: setBusca,
    placeholder: 'Busque sua empresa',
  })
  const [viewMode, setViewMode] = useState<MeusAppsViewMode>('grid')
  const [feedFiltro, setFeedFiltro] = useState<MeusAppsFeedFiltro>('tudo')
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

  const reportHubSessionIssue = useCallback((message: string) => {
    setHubTokenBanner(message)
    toast.error(message, { id: HUB_SESSAO_TOAST_ID, duration: 8000 })

    // Agenda redirect imediato ao login quando o servidor rejeita o token —
    // independente de identityAuth.isExpired() (pode estar revogado no servidor).
    if (!hubSessaoProativaDisparadaRef.current) {
      hubSessaoProativaDisparadaRef.current = true
      redirectTimerRef.current = window.setTimeout(() => {
        void logoutHub().finally(() => {
          window.location.href = '/login'
        })
      }, 3000)
    }
  }, [logoutHub])

  /**
   * Assim que o JWT de identidade expira: mostra banner/toast brevemente e,
   * após 3 s, chama `logoutHub()` + redireciona ao /login.
   * Não espera o poll do AuthGuard (15 s) para dar uma resposta mais ágil ao usuário.
   */
  const hubSessaoProativaDisparadaRef = useRef(false)
  const redirectTimerRef = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (!isRehydrated || !identityAuth) {
      return
    }

    const dispararSeExpirado = () => {
      if (!identityAuth.isExpired()) {
        return
      }
      if (hubSessaoProativaDisparadaRef.current) {
        return
      }
      hubSessaoProativaDisparadaRef.current = true
      reportHubSessionIssue(HUB_SESSAO_TOKEN_MENSAGEM)

      // Redirecionar ao login após breve aviso (3 s para o usuário ler o toast)
      redirectTimerRef.current = window.setTimeout(() => {
        void logoutHub().finally(() => {
          window.location.href = '/login'
        })
      }, 3000)
    }

    dispararSeExpirado()
    const intervalo = window.setInterval(dispararSeExpirado, 15_000)

    const msAteExp = identityAuth.getExpiresAt().getTime() - Date.now()
    let timeoutId: number | undefined
    if (msAteExp > 0 && msAteExp < 1000 * 60 * 60 * 72) {
      timeoutId = window.setTimeout(dispararSeExpirado, msAteExp + 750)
    }

    return () => {
      window.clearInterval(intervalo)
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId)
      }
      if (redirectTimerRef.current !== undefined) {
        window.clearTimeout(redirectTimerRef.current)
      }
    }
  }, [identityAuth, isRehydrated, reportHubSessionIssue, logoutHub])

  useEffect(() => {
    if (identityAuth && !identityAuth.isExpired()) {
      hubSessaoProativaDisparadaRef.current = false
      setHubTokenBanner(null)
    }
  }, [identityAuth])

  useEffect(() => {
    if (!isRehydrated || !identityAuth) {
      return
    }

    let cancelado = false

    void (async () => {
      try {
        setConvitesErro(null)
        const token = identityAuth.getAccessToken()
        const res = await fetch('/api/convites/me', {
          method: 'GET',
          credentials: 'include',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  }, [identityAuth, isRehydrated, reportHubSessionIssue])

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
      const token = identityAuth?.getAccessToken()
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
    [identityAuth, convites, mergeEmpresaAceita, reportHubSessionIssue, setConviteLoading]
  )

  const handleRecusarConvite = useCallback(
    async (id: string) => {
      const token = identityAuth?.getAccessToken()
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
    [identityAuth, reportHubSessionIssue, setConviteLoading]
  )

  const appsBase = useMemo(
    () => (hubEmpresas ?? []).map(empresaParaMeusApp),
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
  const feedItems = useMemo((): MeusAppsFeedItem[] => {
    const conv: MeusAppsFeedItem[] = convitesFiltrados.map(c => ({
      kind: 'convite',
      convite: c,
    }))
    const emp: MeusAppsFeedItem[] = appsFiltrados.map(a => ({
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
    () => feedItems.filter((item): item is Extract<MeusAppsFeedItem, { kind: 'convite' }> => item.kind === 'convite'),
    [feedItems]
  )

  const empresaFeedItems = useMemo(
    () => feedItems.filter((item): item is Extract<MeusAppsFeedItem, { kind: 'empresa' }> => item.kind === 'empresa'),
    [feedItems]
  )

  /** Grade resumida: até 15 itens do feed (convites + empresas); busca ativa expande para todos os resultados. */
  const buscaAtiva = Boolean(busca.trim())
  const gridExpandidoEfetivo = feedGridExpandido || buscaAtiva

  const feedItemsParaGrid = useMemo(
    () => (gridExpandidoEfetivo ? feedItems : feedItems.slice(0, MEUS_APPS_GRID_PREVIEW_LIMIT)),
    [feedItems, gridExpandidoEfetivo]
  )

  const conviteFeedItemsGrid = useMemo(
    () =>
      feedItemsParaGrid.filter(
        (item): item is Extract<MeusAppsFeedItem, { kind: 'convite' }> => item.kind === 'convite'
      ),
    [feedItemsParaGrid]
  )

  const empresaFeedItemsGrid = useMemo(
    () =>
      feedItemsParaGrid.filter(
        (item): item is Extract<MeusAppsFeedItem, { kind: 'empresa' }> => item.kind === 'empresa'
      ),
    [feedItemsParaGrid]
  )

  const gridEmpresaCells = useMemo(
    () => buildMeusAppsGridCells(empresaFeedItemsGrid, { expandido: true }),
    [empresaFeedItemsGrid]
  )

  /** Nova busca ou troca de filtro volta ao preview do grid (15 itens). */
  useEffect(() => {
    setFeedGridExpandido(false)
  }, [busca, feedFiltro])

  /** Mesmo fluxo que “Acessar”: POST escolher-empresa (cookie de identidade) + token da empresa. */
  const obterTokenEmpresa = useCallback(async (appId: string): Promise<string> => {
    return fetchAccessTokenEscolherEmpresa(appId)
  }, [])

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

  const handleAcessar = async (appId: string) => {
    const app = appsBase.find(a => a.id === appId)
    if (app?.status === 'inativo') {
      return
    }

    setAcessoErro(null)
    setBusyAppId(appId)

    try {
      const token = await obterTokenEmpresa(appId)
      const { empParam } = prepareTabSession(token, app?.nome ?? '', appId)
      window.open(`/gestao/${empParam}/dashboard`, '_blank')
    } catch (e) {
      reportErroAcessoEmpresa(e, appId)
    } finally {
      setBusyAppId(null)
    }
  }

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
        '/meus-apps/gerenciar-usuarios'
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
        '/meus-apps/perfis-gestor'
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
    feedItems.length > MEUS_APPS_GRID_PREVIEW_LIMIT &&
    !buscaAtiva

  return (
    <div className="min-h-0 w-full bg-gray-50 pb-8">
      <div className="mx-auto w-full max-w-[1400px] px-2 pt-3 md:px-4">
        <header className="mb-4 flex flex-col gap-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <h1 className="font-exo text-2xl font-semibold text-gray-900 md:text-3xl">
                Meus aplicativos
              </h1>
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
              onOpenFilters={() => {
                console.log('Abrir filtros')
              }}
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
              <MeusAppsFeedGrid
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
              <MeusAppsFeedList
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
                Existem mais convites ou empresas além dos {MEUS_APPS_GRID_PREVIEW_LIMIT} primeiros
                desta lista.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
