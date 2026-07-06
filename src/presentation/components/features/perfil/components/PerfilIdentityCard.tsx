'use client'

import { Mail, MapPin } from 'lucide-react'
import { cn } from '@/src/shared/utils/cn'
import { PERFIL_CAMPO_VAZIO, PERFIL_EXIBIR_LOCALIZACAO_CARD } from '../types/perfilTypes'
import { perfilValorOuPlaceholder } from '../utils/perfilDisplayUtils'
import { PerfilIdentityCardHeaderImage } from './PerfilIdentityCardHeaderDecor'

type PerfilIdentityCardProps = {
  nome: string
  email: string
  localizacao: string | null
}

export function PerfilIdentityCard({ nome, email, localizacao }: PerfilIdentityCardProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center bg-white">
        <PerfilIdentityCardHeaderImage />

        <div className="min-w-0 flex-1 py-4 pr-6">
          <h2 className="truncate text-xl font-semibold text-gray-900">{nome}</h2>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-secondary-text">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Mail className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{email}</span>
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1.5',
                !PERFIL_EXIBIR_LOCALIZACAO_CARD && 'hidden'
              )}
            >
              <MapPin className="size-4 shrink-0" aria-hidden />
              {perfilValorOuPlaceholder(localizacao, PERFIL_CAMPO_VAZIO)}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
