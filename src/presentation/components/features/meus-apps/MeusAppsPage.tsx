'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import type { LoginEmpresaSnapshot } from '@/src/domain/types/LoginEmpresaSnapshot'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { buildAuthFromAccessToken } from '@/src/shared/utils/buildAuthFromAccessToken'
import type { ConvitePendente } from '@/src/presentation/components/features/convites/types'
import { SearchBar } from './components/SearchBar'
import { MeusAppsFeedGrid } from './components/MeusAppsFeedGrid'
import type { MeusAppsFeedItem } from './types'
import { buildMeusAppsGridCells } from './utils/buildMeusAppsGridCells'
import { MeusAppsFeedList } from './components/MeusAppsFeedList'
import {
  ViewControls,
  type MeusAppsFeedFiltro,
  type MeusAppsViewMode,
} from './components/ViewControls'
import { MeusAppsTopNav } from './components/MeusAppsTopNav'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { empresaParaMeusApp } from './utils/empresaParaMeusApp'
import { conviteParaEmpresaSnapshot } from '@/src/presentation/components/features/convites/utils/conviteParaEmpresaSnapshot'
import {
  HUB_SESSAO_TOKEN_MENSAGEM,
  isLikelyHubSessionTokenError,
} from './utils/hubSessionTokenFeedback'
import { appEmpresaCorrespondeBusca, conviteCorrespondeBusca } from './utils/meusAppsBusca'
import { empresaNomeParaSlugUrl } from '@/src/shared/utils/empresaNomeParaSlugUrl'

const HUB_SESSAO_TOAST_ID = 'meus-apps-sessao-token'

export default function MeusAppsPage() {
  const hubEmpresas = useAuthStore(s => s.hubEmpresas)
  const setHubEmpresas = useAuthStore(s => s.setHubEmpresas)
  /** Sessão do hub (identidade); não usar `auth` aqui — pode ser só tenant se outra aba abriu empresa. */
  const identityAuth = useAuthStore(s => s.identityAuth)
  const setTenantAuth = useAuthStore(s => s.setTenantAuth)
  const isRehydrated = useAuthStore(s => s.isRehydrated)

  const [busca, setBusca] = useState('')
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
  }, [])

  /** Assim que o JWT expira (ou pouco depois): toast + banner, sem esperar nova requisição. */
  const hubSessaoProativaDisparadaRef = useRef(false)
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
    }
  }, [identityAuth, isRehydrated, reportHubSessionIssue])

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

  /** Com grade “resumida”, só os 2 primeiros itens do feed aparecem — convites vêm primeiro e escondiam empresas. Com busca ativa, expande para mostrar todos os resultados. */
  const buscaAtiva = Boolean(busca.trim())
  const gridExpandidoEfetivo = feedGridExpandido || buscaAtiva

  const gridCells = useMemo(
    () => buildMeusAppsGridCells(feedItems, { expandido: gridExpandidoEfetivo }),
    [feedItems, gridExpandidoEfetivo]
  )

  /** Nova busca ou troca de filtro volta ao preview da primeira linha no grid. */
  useEffect(() => {
    setFeedGridExpandido(false)
  }, [busca, feedFiltro])

  /** Mesmo fluxo que “Acessar”: POST escolher-empresa + token da empresa no store (aba atual). */
  const aplicarContextoEmpresa = useCallback(
    async (appId: string): Promise<void> => {
      const idTok = identityAuth?.getAccessToken()
      const res = await fetch('/api/auth/escolher-empresa', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(idTok ? { Authorization: `Bearer ${idTok}` } : {}),
        },
        body: JSON.stringify({ empresaId: appId }),
      })

      const body = (await res.json().catch(() => ({}))) as { error?: string; accessToken?: string }

      if (!res.ok) {
        throw new Error(typeof body.error === 'string' ? body.error : `Erro ${res.status}`)
      }

      const accessToken = body.accessToken
      if (!accessToken) {
        throw new Error('Resposta sem accessToken')
      }

      const prev = identityAuth?.getUser()
      const novoAuth = buildAuthFromAccessToken(
        accessToken,
        prev
          ? { id: prev.getId(), email: prev.getEmail(), name: prev.getName() }
          : undefined
      )

      setTenantAuth(novoAuth)
    },
    [identityAuth, setTenantAuth]
  )

  const reportErroAcessoEmpresa = useCallback(
    (e: unknown) => {
      const msg =
        e instanceof Error ? e.message : 'Não foi possível abrir o aplicativo'
      if (isLikelyHubSessionTokenError(msg)) {
        reportHubSessionIssue(msg)
        setAcessoErro(null)
      } else {
        setAcessoErro(msg)
      }
    },
    [reportHubSessionIssue]
  )

  const handleAcessar = async (appId: string) => {
    const app = appsBase.find(a => a.id === appId)
    if (app?.status === 'inativo') {
      return
    }

    setAcessoErro(null)
    setBusyAppId(appId)

    try {
      await aplicarContextoEmpresa(appId)
      window.open('/dashboard', '_blank', 'noopener,noreferrer')
    } catch (e) {
      reportErroAcessoEmpresa(e)
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
      await aplicarContextoEmpresa(appId)
      const slug = empresaNomeParaSlugUrl(app.nome)
      // Sem noopener: a aba de convites usa `window.opener` no Voltar para focar o hub e fechar só esta guia.
      window.open(`/meus-apps/convidar-usuarios/${slug}`, '_blank')
    } catch (e) {
      reportErroAcessoEmpresa(e)
    }
  }

  const handleGerenciarUsuariosGestor = async (appId: string) => {
    const app = appsBase.find(a => a.id === appId)
    if (!app || app.status === 'inativo') {
      return
    }

    setAcessoErro(null)

    try {
      await aplicarContextoEmpresa(appId)
      const slug = empresaNomeParaSlugUrl(app.nome)
      window.open(`/meus-apps/usuarios-gestor/${slug}`, '_blank')
    } catch (e) {
      reportErroAcessoEmpresa(e)
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

  const descricaoSecaoFeed = useMemo(() => {
    if (feedFiltro === 'convites') {
      return 'Somente convites pendentes para o seu e-mail.'
    }
    if (feedFiltro === 'empresas') {
      return 'Somente empresas já vinculadas à sua conta.'
    }
    return 'Convites pendentes aparecem primeiro; em seguida, empresas vinculadas.'
  }, [feedFiltro])

  /** Só na grade: com ≤2 itens a primeira linha já mostra tudo (máx. 2 + slot promo); a partir do 3º item há conteúdo “escondido” até expandir. Busca já expande a grade. */
  const gridPodeResumo =
    convitesCarregados &&
    !feedVazio &&
    viewMode === 'grid' &&
    feedItems.length > 2 &&
    !buscaAtiva

  return (
    <div className="min-h-0 w-full bg-gray-50 pb-8">
      <MeusAppsTopNav />
      <div className="mx-auto w-full max-w-[1400px] px-2 pt-3 md:px-4">
        <header className="mb-4 flex flex-col gap-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <h1 className="font-exo text-2xl font-semibold text-gray-900 md:text-3xl">
                Meus aplicativos
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Convites pendentes e empresas vinculadas à sua conta.
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

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <SearchBar value={busca} onChange={setBusca} className="md:max-w-[520px]" />
            <div className="flex items-center justify-between gap-2 md:justify-end">
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
            <h2 className="mb-1 text-lg font-semibold text-gray-900">Aplicativos e convites</h2>
            <p className="mb-4 text-sm text-gray-600">{descricaoSecaoFeed}</p>

            {feedVazio ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
                <p className="text-sm font-semibold text-gray-900">{mensagemFeedVazioTitulo}</p>
                <p className="mt-2 text-sm text-gray-600">{mensagemFeedVazioSubtitulo}</p>
              </div>
            ) : viewMode === 'grid' ? (
              <MeusAppsFeedGrid
                cells={gridCells}
                onAcessar={handleAcessar}
                onGerenciarConvites={handleGerenciarConvites}
                onGerenciarUsuariosGestor={handleGerenciarUsuariosGestor}
                busyAppId={busyAppId}
                onAceitarConvite={handleAceitarConvite}
                onRecusarConvite={handleRecusarConvite}
                loadingConviteById={loadingConviteById}
              />
            ) : (
              <MeusAppsFeedList
                items={feedItems}
                onAcessar={handleAcessar}
                onGerenciarConvites={handleGerenciarConvites}
                onGerenciarUsuariosGestor={handleGerenciarUsuariosGestor}
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
                Existem mais convites ou empresas além dos dois primeiros desta lista.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
