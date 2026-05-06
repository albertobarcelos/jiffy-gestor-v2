'use client'

import { useMemo, useState } from 'react'
import type { ConviteGestaoDTO } from '@/src/application/dto/convites/ConvitesGestaoDTO'
import { MdSearch } from 'react-icons/md'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { ConviteGestaoRow } from './components/ConviteGestaoRow'

export function ConvitesGestaoList({
  convites,
  loading,
  error,
  busyById,
  onCancelar,
  onReenviar,
}: {
  convites: ConviteGestaoDTO[]
  loading: boolean
  error: string | null
  busyById: Record<string, 'cancelar' | 'reenviar' | null>
  onCancelar: (id: string) => void
  onReenviar: (id: string) => void
}) {
  const [busca, setBusca] = useState('')
  const [mostrarTodos, setMostrarTodos] = useState(false)

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase()
    let base = mostrarTodos ? convites : convites.filter(c => c.status === 'PENDENTE')
    if (q) {
      base = base.filter(c => c.email.toLowerCase().includes(q))
    }
    return base
  }, [convites, busca, mostrarTodos])

  if (loading && convites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12">
        <JiffyLoading />
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="mx-1 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        role="alert"
      >
        {error}
      </div>
    )
  }

  return (
    <div className="flex w-full min-w-0 max-w-full flex-col gap-3">
      <div className="flex flex-shrink-0 flex-col gap-2 px-1 md:flex-row md:items-center md:justify-between">
        <div className="relative h-8 min-w-[180px] max-w-[360px] flex-1">
          <MdSearch className="absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-secondary-text" />
          <input
            type="search"
            placeholder="Buscar por e-mail…"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="h-full w-full rounded-lg border border-gray-200 bg-info pl-11 pr-4 font-nunito text-sm text-primary-text placeholder:text-secondary-text focus:border-primary focus:outline-none"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 font-nunito text-sm text-primary-text">
          <input
            type="checkbox"
            checked={mostrarTodos}
            onChange={e => setMostrarTodos(e.target.checked)}
            className="rounded border-gray-300"
          />
          Mostrar todos os status
        </label>
      </div>

      {visiveis.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <p className="font-nunito text-sm text-secondary-text">
            {convites.length === 0
              ? 'Nenhum convite encontrado.'
              : 'Nenhum convite neste filtro. Marque “Mostrar todos os status” ou limpe a busca.'}
          </p>
        </div>
      ) : (
        <>
          {/* Grade com minmax(0,…) para colunas encolherem dentro da largura útil */}
          <div className="hidden min-w-0 flex-shrink-0 px-1 md:block">
            <div className="grid h-10 w-full min-w-0 grid-cols-[minmax(0,3fr)_minmax(0,1fr)_minmax(0,0.85fr)_minmax(0,1.35fr)_minmax(0,1.35fr)_5rem] items-center gap-[10px] rounded-lg bg-custom-2 px-2 pr-1 md:px-4">
              <div className="min-w-0 truncate text-left font-nunito text-sm font-semibold text-primary-text">
                E-mail
              </div>
              <div className="min-w-0 truncate text-center font-nunito text-sm font-semibold text-primary-text">
                Status
              </div>
              <div className="min-w-0 truncate text-center font-nunito text-sm font-semibold text-primary-text">
                Enviado
              </div>
              <div className="min-w-0 truncate text-center font-nunito text-sm font-semibold text-primary-text">
                Expira em
              </div>
              <div className="min-w-0 truncate text-center font-nunito text-sm font-semibold text-primary-text">
                Criado em
              </div>
              <div className="min-w-0 shrink-0 text-center font-nunito text-sm font-semibold text-primary-text">
                Ações
              </div>
            </div>
          </div>

          <div className="min-w-0 max-w-full px-1 scrollbar-hide">
            {visiveis.map((c, index) => (
              <ConviteGestaoRow
                key={c.id}
                convite={c}
                index={index}
                busyAction={busyById[c.id] ?? null}
                onCancelar={onCancelar}
                onReenviar={onReenviar}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
