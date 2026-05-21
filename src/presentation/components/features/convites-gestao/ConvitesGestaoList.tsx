'use client'

import { useMemo, useState } from 'react'
import type { ConviteGestaoDTO } from '@/src/application/dto/convites/ConvitesGestaoDTO'
import type { PerfilGestorOption, UsuarioGestorListaItem } from './hooks/useConvitesGestao'
import { MdSearch } from 'react-icons/md'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { ConviteGestaoRow } from './components/ConviteGestaoRow'
import { GestorSemConviteRow } from './components/GestorSemConviteRow'

type LinhaGestao =
  | { tipo: 'convite'; convite: ConviteGestaoDTO }
  | { tipo: 'gestor'; gestor: UsuarioGestorListaItem }

export function ConvitesGestaoList({
  convites,
  usuariosGestor,
  perfisList,
  perfilGestorNomePorId,
  loading,
  error,
  busyById,
  onCancelar,
  onReenviar,
  onPerfilChange,
  onRemoverVinculo,
  onEditarGrupos,
}: {
  /** Convites com status PENDENTE (sem gestor com o mesmo e-mail). */
  convites: ConviteGestaoDTO[]
  /** Usuários gestor — fonte principal quando o e-mail existe nas duas tabelas. */
  usuariosGestor: UsuarioGestorListaItem[]
  perfisList: PerfilGestorOption[]
  perfilGestorNomePorId: Record<string, string>
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

  const linhasVisiveis = useMemo((): LinhaGestao[] => {
    const q = busca.trim().toLowerCase()
    const gestFiltrados = q
      ? usuariosGestor.filter(
          g =>
            g.username.toLowerCase().includes(q) ||
            g.nome.toLowerCase().includes(q) ||
            (g.perfilGestorName ?? '').toLowerCase().includes(q)
        )
      : usuariosGestor
    const convFiltrados = (q
      ? convites.filter(c => c.email.toLowerCase().includes(q))
      : convites
    ).sort((a, b) => a.email.localeCompare(b.email, 'pt-BR'))
    const gestOrdenados = [...gestFiltrados].sort((a, b) => {
      const an = (a.nome || a.username).toLowerCase()
      const bn = (b.nome || b.username).toLowerCase()
      return an.localeCompare(bn, 'pt-BR')
    })
    return [
      ...convFiltrados.map(convite => ({ tipo: 'convite' as const, convite })),
      ...gestOrdenados.map(gestor => ({ tipo: 'gestor' as const, gestor })),
    ]
  }, [convites, usuariosGestor, busca])

  const listaVazia = convites.length === 0 && usuariosGestor.length === 0

  if (loading && listaVazia) {
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
            placeholder="Buscar por e-mail, nome ou perfil..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="h-full w-full rounded-lg border border-gray-200 bg-info pl-11 pr-4 font-nunito text-sm text-primary-text placeholder:text-secondary-text focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {linhasVisiveis.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <p className="font-nunito text-sm text-secondary-text">
            {listaVazia
              ? 'Nenhum usuário gestor nem convite pendente encontrado.'
              : 'Nenhum resultado para esta busca.'}
          </p>
        </div>
      ) : (
        <div className="overflow-visible rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="hidden min-w-0 flex-shrink-0 md:block">
            <div className="grid h-11 w-full min-w-0 grid-cols-[minmax(180px,280px)_80px_160px] items-center gap-[10px] border-b border-gray-200 bg-gray-50 px-3 pr-2 md:px-4">
              <div className="min-w-0 truncate text-left font-nunito text-xs font-semibold text-secondary md:text-sm">
                Convites pendentes / Usuários ativos
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
            {linhasVisiveis.map(linha => {
              if (linha.tipo === 'gestor') {
                const g = linha.gestor
                return (
                  <GestorSemConviteRow
                    key={`gestor-${g.id}`}
                    gestor={g}
                    perfisList={perfisList}
                    perfilGestorNomePorId={perfilGestorNomePorId}
                    busyAction={busyById[g.id] ?? null}
                    onPerfilChange={onPerfilChange}
                    onRemoverVinculo={onRemoverVinculo}
                    onEditarGrupos={onEditarGrupos}
                  />
                )
              }

              const c = linha.convite
              return (
                <ConviteGestaoRow
                  key={c.id}
                  convite={c}
                  nomeUsuario={null}
                  perfilNome={perfilGestorNomePorId[c.perfilGestorId] ?? '\u2014'}
                  perfisList={null}
                  busyAction={busyById[c.id] ?? null}
                  onCancelar={onCancelar}
                  onReenviar={onReenviar}
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
