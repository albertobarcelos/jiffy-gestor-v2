'use client'

import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'

export interface SalvandoOverlayProps {
  isSalvandoPermissoes: boolean
  salvandoPermissoesProgresso: { atual: number; total: number } | null
}

export function SalvandoOverlay({
  isSalvandoPermissoes,
  salvandoPermissoesProgresso,
}: SalvandoOverlayProps) {
  if (!isSalvandoPermissoes) return null

  const mensagem = salvandoPermissoesProgresso
    ? `Salvando permissões (${salvandoPermissoesProgresso.atual}/${salvandoPermissoesProgresso.total})...`
    : 'Salvando permissões...'

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-black/50 px-4"
      role="alert"
      aria-busy="true"
      aria-live="polite"
    >
      <JiffyLoading />
      <p className="text-center font-nunito text-sm font-medium text-white">{mensagem}</p>
    </div>
  )
}
