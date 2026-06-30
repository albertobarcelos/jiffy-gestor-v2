'use client'

import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'

export interface SalvandoOverlayProps {
  isSalvandoPermissoes: boolean
  isSalvandoFiscal: boolean
  salvandoPermissoesProgresso: { atual: number; total: number } | null
  salvandoFiscalProgresso: { atual: number; total: number } | null
}

export function SalvandoOverlay({
  isSalvandoPermissoes,
  isSalvandoFiscal,
  salvandoPermissoesProgresso,
  salvandoFiscalProgresso,
}: SalvandoOverlayProps) {
  if (!isSalvandoPermissoes && !isSalvandoFiscal) return null

  const mensagem = isSalvandoFiscal
    ? salvandoFiscalProgresso
      ? `Salvando dados fiscais (${salvandoFiscalProgresso.atual}/${salvandoFiscalProgresso.total})...`
      : 'Salvando dados fiscais...'
    : salvandoPermissoesProgresso
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
