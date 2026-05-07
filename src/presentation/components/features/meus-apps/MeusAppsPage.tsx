'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { LoginEmpresaSnapshot } from '@/src/domain/types/LoginEmpresaSnapshot'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { buildAuthFromAccessToken } from '@/src/shared/utils/buildAuthFromAccessToken'
import type { ConvitePendente } from '@/src/presentation/components/features/convites/types'
import { SearchBar } from './components/SearchBar'
import { MeusAppsFeedGrid } from './components/MeusAppsFeedGrid'
import type { MeusAppsFeedItem } from './types'
import { buildMeusAppsGridCells } from './utils/buildMeusAppsGridCells'
import { MeusAppsFeedList } from './components/MeusAppsFeedList'
import { ViewControls, type MeusAppsViewMode } from './components/ViewControls'
import { MeusAppsTopNav } from './components/MeusAppsTopNav'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { empresaParaMeusApp } from './utils/empresaParaMeusApp'
import { conviteParaEmpresaSnapshot } from '@/src/presentation/components/features/convites/utils/conviteParaEmpresaSnapshot'

export default function MeusAppsPage() {
  const hubEmpresas = useAuthStore(s => s.hubEmpresas)
  const setHubEmpresas = useAuthStore(s => s.setHubEmpresas)
  const auth = useAuthStore(s => s.auth)
  const login = useAuthStore(s => s.login)
  const isRehydrated = useAuthStore(s => s.isRehydrated)

  const [busca, setBusca] = useState('')
  const [viewMode, setViewMode] = useState<MeusAppsViewMode>('grid')
  const [busyAppId, setBusyAppId] = useState<string | null>(null)
  const [acessoErro, setAcessoErro] = useState<string | null>(null)

  const [convites, setConvites] = useState<ConvitePendente[] | null>(null)
  const [convitesErro, setConvitesErro] = useState<string | null>(null)
  const [loadingConviteById, setLoadingConviteById] = useState<
    Record<string, 'aceitar' | 'recusar' | null>
  >({})

  /** No grid, primeira linha pode incluir card promocional; “Mostrar mais” expande o feed completo. */
  const [feedGridExpandido, setFeedGridExpandido] = useState(false)

  useEffect(() => {
    if (!isRehydrated || !auth) {
      return
    }

    let cancelado = false

    void (async () => {
      try {
        setConvitesErro(null)
        const token = auth.getAccessToken()
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
        }
      } catch (e) {
        if (!cancelado) {
          setConvitesErro(e instanceof Error ? e.message : 'Erro ao carregar convites')
          setConvites([])
        }
      }
    })()

    return () => {
      cancelado = true
    }
  }, [auth, isRehydrated])

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
      const token = auth?.getAccessToken()
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
        setConvitesErro(e instanceof Error ? e.message : 'Erro ao aceitar convite')
      } finally {
        setConviteLoading(id, null)
      }
    },
    [auth, convites, mergeEmpresaAceita, setConviteLoading]
  )

  const handleRecusarConvite = useCallback(
    async (id: string) => {
      const token = auth?.getAccessToken()
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
        setConvitesErro(e instanceof Error ? e.message : 'Erro ao recusar convite')
      } finally {
        setConviteLoading(id, null)
      }
    },
    [auth, setConviteLoading]
  )

  const appsBase = useMemo(
    () => (hubEmpresas ?? []).map(empresaParaMeusApp),
    [hubEmpresas]
  )

  const appsFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) {
      return appsBase
    }
    return appsBase.filter(
      a =>
        a.nome.toLowerCase().includes(q) ||
        (a.tipo && a.tipo.toLowerCase().includes(q))
    )
  }, [busca, appsBase])

  const convitesCarregadosFlag = convites !== null

  /** Convites filtrados pela busca (nome da empresa ou e-mail); só após GET /convites/me. */
  const convitesFiltrados = useMemo(() => {
    if (!convitesCarregadosFlag || !convites?.length) {
      return []
    }
    const q = busca.trim().toLowerCase()
    if (!q) {
      return convites
    }
    return convites.filter(
      c =>
        c.nomeEmpresa.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    )
  }, [convitesCarregadosFlag, convites, busca])

  /** Convites primeiro; depois empresas vinculadas (mesmo modo grade/lista). */
  const feedItems = useMemo((): MeusAppsFeedItem[] => {
    const conv: MeusAppsFeedItem[] = convitesFiltrados.map(c => ({
      kind: 'convite',
      convite: c,
    }))
    const emp: MeusAppsFeedItem[] = appsFiltrados.map(a => ({
      kind: 'empresa',
      app: a,
    }))
    return [...conv, ...emp]
  }, [convitesFiltrados, appsFiltrados])

  const gridCells = useMemo(
    () => buildMeusAppsGridCells(feedItems, { expandido: feedGridExpandido }),
    [feedItems, feedGridExpandido]
  )

  /** Nova busca volta ao preview da primeira linha no grid. */
  useEffect(() => {
    setFeedGridExpandido(false)
  }, [busca])

  const handleAcessar = async (appId: string) => {
    const app = appsBase.find(a => a.id === appId)
    if (app?.status === 'inativo') {
      return
    }

    setAcessoErro(null)
    setBusyAppId(appId)

    try {
      const res = await fetch('/api/auth/escolher-empresa', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
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

      const prev = auth?.getUser()
      const novoAuth = buildAuthFromAccessToken(
        accessToken,
        prev
          ? { id: prev.getId(), email: prev.getEmail(), name: prev.getName() }
          : undefined
      )

      login(novoAuth)

      window.open('/dashboard', '_blank', 'noopener,noreferrer')
    } catch (e) {
      setAcessoErro(e instanceof Error ? e.message : 'Não foi possível abrir o aplicativo')
    } finally {
      setBusyAppId(null)
    }
  }

  const convitesCarregados = convitesCarregadosFlag
  const temEmpresas = appsBase.length > 0
  const feedVazio = feedItems.length === 0

  /** Só na grade: com ≤2 itens a primeira linha já mostra tudo (máx. 2 + slot promo); a partir do 3º item há conteúdo “escondido” até expandir. */
  const gridPodeResumo = convitesCarregados && !feedVazio && viewMode === 'grid' && feedItems.length > 2

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

          {acessoErro ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {acessoErro}
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
            <p className="mb-4 text-sm text-gray-600">
              Convites pendentes aparecem primeiro; em seguida, empresas vinculadas.
            </p>

            {feedVazio ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
                <p className="text-sm font-semibold text-gray-900">
                  {busca.trim()
                    ? 'Nenhum resultado para a busca.'
                    : 'Nenhum aplicativo ou convite nesta lista.'}
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  {!temEmpresas && hubEmpresas === null
                    ? 'Faça login novamente com um usuário gestor para carregar os dados da conta.'
                    : !temEmpresas && (convites?.length ?? 0) === 0
                      ? 'Aceite um convite ou aguarde novos vínculos.'
                      : 'Ajuste o filtro de busca ou tente outro termo.'}
                </p>
              </div>
            ) : viewMode === 'grid' ? (
              <MeusAppsFeedGrid
                cells={gridCells}
                onAcessar={handleAcessar}
                busyAppId={busyAppId}
                onAceitarConvite={handleAceitarConvite}
                onRecusarConvite={handleRecusarConvite}
                loadingConviteById={loadingConviteById}
              />
            ) : (
              <MeusAppsFeedList
                items={feedItems}
                onAcessar={handleAcessar}
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
