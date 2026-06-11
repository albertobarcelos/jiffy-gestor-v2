'use client'

import { Mail, MapPin } from 'lucide-react'
import { PERFIL_CAMPO_VAZIO } from '../types/perfilTypes'
import { perfilValorOuPlaceholder } from '../utils/perfilDisplayUtils'

type PerfilIdentityCardProps = {
  nome: string
  email: string
  iniciais: string
  localizacao: string | null
}

export function PerfilIdentityCard({
  nome,
  email,
  iniciais,
  localizacao,
}: PerfilIdentityCardProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div
          className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-2xl font-semibold text-white"
          aria-hidden
        >
          {iniciais}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold text-gray-900">{nome}</h2>

          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-secondary-text">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Mail className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{email}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4 shrink-0" aria-hidden />
              {perfilValorOuPlaceholder(localizacao, PERFIL_CAMPO_VAZIO)}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
