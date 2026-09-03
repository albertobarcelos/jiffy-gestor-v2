'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MdChevronRight, MdLogout, MdSearch } from 'react-icons/md'
import type { LoginEmpresaSnapshot } from '@/src/domain/types/LoginEmpresaSnapshot'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { formatarCnpjExibicao } from '@/src/presentation/components/features/minhas-empresas/utils/empresaParaMinhasEmpresas'
import { fetchAccessTokenEscolherEmpresa } from '@/src/presentation/utils/escolherEmpresaApi'
import { ensureHubBearerToken } from '@/src/presentation/utils/ensureHubBearerToken'
import { disconnectHubTab } from '@/src/presentation/utils/disconnectHubTab'
import { entrarEmpresaGestorNaAba } from '../sessao/entrarEmpresaGestorNaAba'
import {
  deveCarregarMaisEmpresasFlow,
  filtrarEmpresasFlow,
  PAGE_SIZE_EMPRESAS_FLOW,
} from './filtrarEmpresasFlow'
import {
  deveIrAoLoginPorSessao,
  fetchEmpresasAcessoPagina,
} from './empresasAcessoApi'
import { lerEmpresasLoginFlow } from './empresasLoginFlow'
import { lerUltimaEmpresaKiosk } from './ultimaEmpresaKiosk'

function siglaEmpresa(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
  }
  return nome.trim().slice(0, 2).toUpperCase() || '?'
}

/**
 * Lista de empresas só do Jiffy Flow. O hub web continua em Minhas Empresas.
 */
export function EscolherEmpresaFlowPage() {
  const router = useRouter()
  const hubEmpresas = useAuthStore(s => s.hubEmpresas)
  const identityAuth = useAuthStore(s => s.identityAuth)
  const logoutHub = useAuthStore(s => s.logoutHub)
  const isRehydrated = useAuthStore(s => s.isRehydrated)
  const identityOk = Boolean(identityAuth && !identityAuth.isExpired())
  const [buscaInput, setBuscaInput] = useState('')
  const [busca, setBusca] = useState('')
  const [items, setItems] = useState<LoginEmpresaSnapshot[]>([])
  const [hasNext, setHasNext] = useState(false)
  const [total, setTotal] = useState(0)
  const [visiveis, setVisiveis] = useState(PAGE_SIZE_EMPRESAS_FLOW)
  const [listaPronta, setListaPronta] = useState(false)
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const bearerRef = useRef<string | null>(null)
  const fonteRef = useRef<'local' | 'api'>('local')

  const irAoLogin = useCallback(() => {
    void disconnectHubTab({ logoutHub })
  }, [logoutHub])

  const falhouSessao = useCallback(
    (status: number, message: string) => {
      if (deveIrAoLoginPorSessao(status, message)) {
        irAoLogin()
        return true
      }
      return false
    },
    [irAoLogin]
  )

  useEffect(() => {
    if (!isRehydrated || listaPronta) return
    const t = window.setTimeout(() => {
      if (listaPronta) return
      setErro('Não foi possível carregar as empresas. Entre novamente.')
      setListaPronta(true)
    }, 4000)
    return () => window.clearTimeout(t)
  }, [isRehydrated, listaPronta])

  useEffect(() => {
    const t = window.setTimeout(() => setBusca(buscaInput.trim()), 300)
    return () => window.clearTimeout(t)
  }, [buscaInput])

  const locais = useMemo(() => {
    const doStore = (hubEmpresas ?? []).filter(e => Boolean(e.id) && !e.bloqueado)
    if (doStore.length > 0) return doStore
    return lerEmpresasLoginFlow().filter(e => Boolean(e.id) && !e.bloqueado)
  }, [hubEmpresas])
  const lastId = lerUltimaEmpresaKiosk()?.empresaId ?? null

  const aplicarListaLocal = useCallback(
    (termo: string, limite: number) => {
      const filtradas = filtrarEmpresasFlow(locais, termo, lastId)
      setItems(filtradas.slice(0, limite))
      setHasNext(limite < filtradas.length)
      setTotal(filtradas.length)
      setListaPronta(true)
    },
    [lastId, locais]
  )

  const carregarDaApi = useCallback(
    async (offset: number, termo: string, append: boolean) => {
      const bearer = bearerRef.current ?? (await ensureHubBearerToken())?.token ?? null
      if (!bearer) {
        if (locais.length > 0) {
          fonteRef.current = 'local'
          aplicarListaLocal(termo, PAGE_SIZE_EMPRESAS_FLOW)
          return
        }
        irAoLogin()
        return
      }
      bearerRef.current = bearer
      setCarregandoMais(true)
      try {
        const paginaApi = await fetchEmpresasAcessoPagina({
          offset,
          q: termo,
          bearer,
        })
        setItems(prev => (append ? [...prev, ...paginaApi.items] : paginaApi.items))
        setHasNext(paginaApi.hasNext)
        setTotal(paginaApi.count)
        setListaPronta(true)
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Não foi possível listar as empresas'
        const status =
          typeof (e as { status?: number }).status === 'number' ? (e as { status: number }).status : 0
        if (falhouSessao(status, message)) return
        if (locais.length > 0) {
          fonteRef.current = 'local'
          aplicarListaLocal(termo, PAGE_SIZE_EMPRESAS_FLOW)
          return
        }
        setErro(message)
        setListaPronta(true)
      } finally {
        setCarregandoMais(false)
      }
    },
    [aplicarListaLocal, falhouSessao, irAoLogin, locais.length]
  )

  useEffect(() => {
    if (!isRehydrated) return
    setErro(null)
    setVisiveis(PAGE_SIZE_EMPRESAS_FLOW)
    if (locais.length > 0) {
      fonteRef.current = 'local'
      aplicarListaLocal(busca, PAGE_SIZE_EMPRESAS_FLOW)
      return
    }
    if (identityOk) {
      fonteRef.current = 'local'
      aplicarListaLocal(busca, PAGE_SIZE_EMPRESAS_FLOW)
      return
    }
    fonteRef.current = 'api'
    setItems([])
    setListaPronta(false)
    void carregarDaApi(0, busca, false)
  }, [aplicarListaLocal, busca, carregarDaApi, identityOk, isRehydrated, locais.length])

  useEffect(() => {
    if (fonteRef.current !== 'local') return
    aplicarListaLocal(busca, visiveis)
  }, [aplicarListaLocal, busca, visiveis])

  const pagina = useMemo(() => items.filter(e => !e.bloqueado), [items])

  const carregarMaisSePreciso = useCallback(() => {
    const el = scrollRef.current
    if (!el || carregandoMais || !hasNext) return
    if (
      !deveCarregarMaisEmpresasFlow({
        scrollTop: el.scrollTop,
        clientHeight: el.clientHeight,
        scrollHeight: el.scrollHeight,
        temMais: hasNext,
      })
    ) {
      return
    }
    if (fonteRef.current === 'local') {
      setVisiveis(n => n + PAGE_SIZE_EMPRESAS_FLOW)
      return
    }
    void carregarDaApi(items.length, busca, true)
  }, [busca, carregandoMais, carregarDaApi, hasNext, items.length])

  useEffect(() => {
    if (!listaPronta) return
    carregarMaisSePreciso()
  }, [carregarMaisSePreciso, listaPronta, pagina.length])

  const selecionar = useCallback(
    async (empresa: LoginEmpresaSnapshot) => {
      if (busyId) return
      setErro(null)
      setBusyId(empresa.id)
      try {
        const bearer = bearerRef.current ?? (await ensureHubBearerToken())?.token ?? null
        if (!bearer) {
          irAoLogin()
          return
        }
        const token = await fetchAccessTokenEscolherEmpresa(empresa.id, bearer)
        router.replace(
          entrarEmpresaGestorNaAba({
            accessToken: token,
            empresaNome: empresa.nomeFantasia,
            empresaId: empresa.id,
          })
        )
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Não foi possível abrir esta empresa'
        const status =
          typeof (e as { status?: number }).status === 'number' ? (e as { status: number }).status : 0
        if (falhouSessao(status, message)) return
        setErro(message)
        setBusyId(null)
      }
    },
    [busyId, falhouSessao, irAoLogin, router]
  )

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col bg-primary-bg">
      <header className="shrink-0 bg-primary px-4 pb-4 pt-5 text-white shadow-md">
        <div className="mx-auto w-full max-w-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold">Suas empresas</h1>
              <p className="mt-1 text-sm text-white/75">
                Escolha a empresa para abrir o quadro de pedidos
              </p>
            </div>
            <button
              type="button"
              onClick={irAoLogin}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-white/90 transition hover:bg-white/10"
              aria-label="Sair"
              title="Sair"
            >
              <MdLogout size={20} aria-hidden />
              Sair
            </button>
          </div>
          <label className="relative mt-4 block">
            <span className="sr-only">Pesquisar por nome ou CNPJ</span>
            <MdSearch
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text"
              size={22}
              aria-hidden
            />
            <input
              type="search"
              value={buscaInput}
              onChange={e => setBuscaInput(e.target.value)}
              placeholder="Pesquisar por nome ou CNPJ"
              autoComplete="off"
              className="h-11 w-full rounded-xl border-0 bg-white pl-11 pr-3 text-sm text-primary-text shadow-sm outline-none placeholder:text-secondary-text focus:ring-2 focus:ring-secondary"
            />
          </label>
        </div>
      </header>

      <div
        ref={scrollRef}
        onScroll={carregarMaisSePreciso}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        <div className="mx-auto w-full max-w-xl px-4 py-4">
          {erro ? (
            <p className="mb-3 rounded-lg bg-white px-3 py-2 text-sm text-error" role="alert">
              {erro}
            </p>
          ) : null}

          {!listaPronta ? (
            <div className="flex justify-center py-10">
              <JiffyLoading />
            </div>
          ) : pagina.length === 0 ? (
            <div className="rounded-xl bg-white px-4 py-10 text-center text-sm text-secondary-text shadow-sm">
              {busca
                ? `Nenhuma empresa encontrada para “${busca}”.`
                : 'Nenhuma empresa disponível nesta conta.'}
            </div>
          ) : (
            <>
              <p className="mb-2 text-xs text-secondary-text">
                {pagina.length}
                {total > pagina.length ? ` de ${total}` : ''}
              </p>
              <ul className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-primary/10">
                {pagina.map(empresa => {
                  const last = empresa.id === lastId
                  return (
                    <li key={empresa.id} className="border-b border-primary-bg last:border-b-0">
                      <button
                        type="button"
                        disabled={Boolean(busyId)}
                        onClick={() => void selecionar(empresa)}
                        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-primary-bg/80 disabled:opacity-60"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                          {siglaEmpresa(empresa.nomeFantasia)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate font-medium text-primary-text">
                              {empresa.nomeFantasia}
                            </span>
                            {last ? (
                              <span className="shrink-0 rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary">
                                Última
                              </span>
                            ) : null}
                          </span>
                          <span className="block truncate text-xs text-secondary-text">
                            {formatarCnpjExibicao(empresa.cnpj)}
                          </span>
                        </span>
                        <MdChevronRight className="h-5 w-5 shrink-0 text-terciary-text" />
                      </button>
                    </li>
                  )
                })}
              </ul>
              {carregandoMais ? (
                <p className="py-4 text-center text-xs text-secondary-text">A carregar mais…</p>
              ) : hasNext ? (
                <p className="py-4 text-center text-xs text-secondary-text">Role para ver mais</p>
              ) : total > PAGE_SIZE_EMPRESAS_FLOW ? (
                <p className="py-4 text-center text-xs text-secondary-text">Fim da lista</p>
              ) : null}
            </>
          )}
        </div>
      </div>

      {busyId ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-primary-bg/80">
          <JiffyLoading text="A abrir a empresa…" />
        </div>
      ) : null}
    </div>
  )
}
