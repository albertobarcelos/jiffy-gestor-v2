'use client'

import { useMemo, useState } from 'react'
import type { ConviteGestaoDTO } from '@/src/application/dto/convites/ConvitesGestaoDTO'
import type { PerfilGestorOption, UsuarioAceitoInfo } from './hooks/useConvitesGestao'
import { MdSearch } from 'react-icons/md'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { ConviteGestaoRow } from './components/ConviteGestaoRow'

export function ConvitesGestaoList({
  convites,
  perfisList,
  perfilGestorNomePorId,
  nomePorEmail,
  usuariosPorEmail,
  loading,
  error,
  busyById,
  onCancelar,
  onReenviar,
  onPerfilChange,
  onRemoverVinculo,
  onEditarGrupos,
}: {
  convites: ConviteGestaoDTO[]
  perfisList: PerfilGestorOption[]
  perfilGestorNomePorId: Record<string, string>
  nomePorEmail: Record<string, string>
  usuariosPorEmail: Record<string, UsuarioAceitoInfo>
  loading: boolean
  error: string | null
  busyById: Record<string, 'cancelar' | 'reenviar' | null>
  onCancelar: (id: string) => void
  onReenviar: (id: string) => void
  onPerfilChange: (email: string, novoPerfilGestorId: string) => void
  onRemoverVinculo: (email: string) => void
  onEditarGrupos?: () => void
}) {
  const [busca, setBusca] = useState('')

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return convites
    return convites.filter(c => c.email.toLowerCase().includes(q))
  }, [convites, busca])

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
    <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-4">
      <div className="flex flex-shrink-0 flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="relative h-8 min-w-[180px] max-w-[360px] flex-1">
          <MdSearch className="absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-secondary-text" />
          <input
            type="search"
            placeholder="Buscar por e-mail..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="h-full w-full rounded-lg border border-gray-200 bg-info pl-11 pr-4 font-nunito text-sm text-primary-text placeholder:text-secondary-text focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {visiveis.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <p className="font-nunito text-sm text-secondary-text">
            {convites.length === 0
              ? 'Nenhum convite encontrado.'
              : 'Nenhum convite encontrado para esta busca.'}
          </p>
        </div>
      ) : (
        <div className="overflow-visible rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="hidden min-w-0 flex-shrink-0 md:block">
            <div className="grid h-11 w-full min-w-0 grid-cols-[minmax(180px,280px)_80px_160px] items-center gap-[10px] border-b border-gray-200 bg-gray-50 px-3 pr-2 md:px-4">
              <div className="min-w-0 truncate text-left font-nunito text-xs font-semibold text-secondary md:text-sm">
                Usuários convidados
              </div>
              <div className="min-w-0 truncate text-left font-nunito text-xs font-semibold text-secondary md:text-sm">
                Situação
              </div>
              <div className="min-w-0 truncate text-left font-nunito text-xs font-semibold text-secondary md:text-sm">
                Perfil
              </div>
            </div>
          </div>

          <div className="min-w-0 max-w-full divide-y divide-gray-100 scrollbar-hide">
            {visiveis.map(c => {
              const emailKey = c.email.toLowerCase().trim()
              const isAceito = c.status.toUpperCase() === 'ACEITO'
              const temUsuario = isAceito && !!usuariosPorEmail[emailKey]

              return (
                <ConviteGestaoRow
                  key={c.id}
                  convite={c}
                  nomeUsuario={nomePorEmail[emailKey] ?? null}
                  perfilNome={perfilGestorNomePorId[c.perfilGestorId] ?? '\u2014'}
                  perfisList={temUsuario ? perfisList : null}
                  busyAction={busyById[c.id] ?? null}
                  onCancelar={onCancelar}
                  onReenviar={onReenviar}
                  onPerfilChange={temUsuario ? onPerfilChange : undefined}
                  onRemoverVinculo={temUsuario ? onRemoverVinculo : undefined}
                  onEditarGrupos={onEditarGrupos}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
