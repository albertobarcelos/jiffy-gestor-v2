'use client'

import { useCallback, useMemo, useState } from 'react'
import type { LoginEmpresaSnapshot } from '@/src/domain/types/LoginEmpresaSnapshot'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { fetchAccessTokenEscolherEmpresa } from '@/src/presentation/utils/escolherEmpresaApi'
import { ensureHubBearerToken } from '@/src/presentation/utils/ensureHubBearerToken'
import { disconnectHubTab } from '@/src/presentation/utils/disconnectHubTab'
import { entrarEmpresaExpedicaoNaAba } from '@/src/presentation/expedicao/sessao/entrarEmpresaExpedicaoNaAba'
import { pathLoginExpedicao, type SuperficieExpedicao } from '@/src/presentation/expedicao/sessao/pathsExpedicao'
import { isSinalExpedicaoAppSearch } from '@/src/presentation/expedicao/sessao/sinalExpedicao'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'

export function ExpedicaoEscolherEmpresaPage() {
  const hubEmpresas = useAuthStore(s => s.hubEmpresas)
  const logoutHub = useAuthStore(s => s.logoutHub)
  const isRehydrated = useAuthStore(s => s.isRehydrated)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const opcoes = useMemo(
    () => (hubEmpresas ?? []).filter(e => Boolean(e.id) && !e.bloqueado),
    [hubEmpresas]
  )

  const superficie: SuperficieExpedicao =
    typeof window !== 'undefined' && isSinalExpedicaoAppSearch(window.location.search) ? 'app' : 'bancada'

  const escolher = useCallback(async (empresa: LoginEmpresaSnapshot) => {
    if (busyId) return
    setErro(null)
    setBusyId(empresa.id)
    try {
      const bearer = (await ensureHubBearerToken())?.token ?? null
      const token = await fetchAccessTokenEscolherEmpresa(empresa.id, bearer)
      window.location.assign(
        entrarEmpresaExpedicaoNaAba({
          accessToken: token,
          empresaNome: empresa.nomeFantasia,
          empresaId: empresa.id,
          superficie,
        })
      )
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível abrir a loja.')
      setBusyId(null)
    }
  }, [busyId, superficie])

  if (!isRehydrated) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <JiffyLoading />
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-dvh max-w-xl flex-col px-6 py-8">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/80">Expedição</p>
      <h1 className="mt-2 text-3xl font-semibold text-primary-text">Escolha a loja</h1>
      <p className="mt-2 text-base text-secondary-text">
        {superficie === 'app'
          ? 'O app fica nesta loja até você trocar em Perfil.'
          : 'O tablet fica nesta empresa até alguém sair.'}
      </p>

      {erro ? (
        <p className="mt-4 text-sm font-medium text-red-600" role="alert">
          {erro}
        </p>
      ) : null}

      <ul className="mt-8 min-h-0 flex-1 space-y-3 overflow-y-auto">
        {opcoes.map(empresa => (
          <li key={empresa.id}>
            <button
              type="button"
              disabled={Boolean(busyId)}
              onClick={() => void escolher(empresa)}
              className="flex w-full items-center justify-between rounded-2xl bg-white px-5 py-5 text-left shadow-sm ring-1 ring-black/5 disabled:opacity-50"
            >
              <span className="text-lg font-semibold text-primary-text">{empresa.nomeFantasia}</span>
              <span className="text-sm text-secondary-text">{busyId === empresa.id ? 'Abrindo…' : 'Entrar'}</span>
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => {
          void disconnectHubTab({ logoutHub }).then(() => {
            window.location.assign(pathLoginExpedicao(superficie))
          })
        }}
        className="mt-6 text-sm font-semibold text-secondary-text underline-offset-4 hover:underline"
      >
        Sair
      </button>
    </div>
  )
}
