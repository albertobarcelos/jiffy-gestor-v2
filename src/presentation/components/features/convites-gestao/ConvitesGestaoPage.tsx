'use client'

import { useCallback, useState } from 'react'
import Image from 'next/image'
import { ArrowLeft, Plus } from 'lucide-react'
import { MeusAppsTopNav } from '@/src/presentation/components/features/meus-apps/components/MeusAppsTopNav'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { empresaNomeParaSlugUrl } from '@/src/shared/utils/empresaNomeParaSlugUrl'
import { useConvitesGestao } from './hooks/useConvitesGestao'
import { ConvitesGestaoList } from './ConvitesGestaoList'
import { NovoConviteModal } from './components/NovoConviteModal'

export default function ConvitesGestaoPage() {
  const { empresa } = useEmpresaMe()
  const {
    convites,
    gestoresSemConvite,
    perfisList,
    perfilGestorNomePorId,
    nomePorEmail,
    usuariosPorEmail,
    loading,
    error,
    busyById,
    handleCriar,
    handleCancelar,
    handleReenviar,
    handlePerfilChange,
    handleRemoverVinculo,
  } = useConvitesGestao()

  const [modalOpen, setModalOpen] = useState(false)

  const nomeEmpresa = empresa?.nomeExibicao ?? ''

  const handleEditarGrupos = useCallback(() => {
    if (!nomeEmpresa) return
    const slug = empresaNomeParaSlugUrl(nomeEmpresa)
    window.open(`/meus-apps/perfis-gestor/${slug}`, '_blank')
  }, [nomeEmpresa])

  const handleVoltar = useCallback(() => {
    if (typeof window === 'undefined') return

    try {
      const { opener } = window
      if (opener && !opener.closed) {
        opener.focus()
        window.close()
        return
      }
    } catch {
      /* opener indisponível */
    }

    window.open('/meus-apps', '_blank', 'noopener,noreferrer')
    try {
      window.close()
    } catch {
      /* noop */
    }

    window.setTimeout(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        window.location.assign('/meus-apps')
      }
    }, 250)
  }, [])

  return (
    <div className="flex h-full min-h-screen min-w-0 flex-col bg-[#fafafa]">
      <MeusAppsTopNav />

      <div className="mx-auto w-full max-w-6xl flex-shrink-0 px-3 pt-4 md:px-8">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleVoltar}
            className="flex h-8 shrink-0 items-center gap-2 rounded-lg bg-secondary px-5 font-exo text-sm font-semibold text-info transition-colors hover:bg-alternate"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            Voltar
          </button>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex h-8 items-center gap-2 rounded-lg bg-secondary px-[30px] font-exo text-sm font-semibold text-info transition-colors hover:bg-alternate"
          >
            Convidar
            <Plus className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
          </button>
        </div>

        {nomeEmpresa && (
          <div className="mt-2 flex flex-col gap-4 border-b border-gray-200 pb-2 md:flex-row md:items-center md:justify-between md:gap-8">
            <div className="min-w-0">
              <h1 className="text-lg font-normal uppercase tracking-tight text-primary-text md:text-xl">
                {nomeEmpresa}
              </h1>
              <p className="mt-1 text-sm text-secondary-text">Ativo</p>
            </div>
            <div className="relative h-36 w-full max-w-[300px] shrink-0 self-start overflow-hidden rounded-lg md:self-center">
              <Image
                src="/images/jiffy-login.png"
                alt="Jiffy"
                fill
                className="object-contain p-2"
                sizes="300px"
                priority
              />
            </div>
          </div>
        )}
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 md:px-8 md:pb-8">
        <ConvitesGestaoList
          convites={convites}
          gestoresSemConvite={gestoresSemConvite}
          perfisList={perfisList}
          perfilGestorNomePorId={perfilGestorNomePorId}
          nomePorEmail={nomePorEmail}
          usuariosPorEmail={usuariosPorEmail}
          loading={loading}
          error={error}
          busyById={busyById}
          onCancelar={handleCancelar}
          onReenviar={handleReenviar}
          onPerfilChange={handlePerfilChange}
          onRemoverVinculo={handleRemoverVinculo}
          onEditarGrupos={handleEditarGrupos}
        />
      </div>

      <NovoConviteModal open={modalOpen} onOpenChange={setModalOpen} onSubmit={handleCriar} />
    </div>
  )
}
