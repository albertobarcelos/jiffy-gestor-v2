'use client'

import { MdSettings } from 'react-icons/md'
import { TbCashRegister } from 'react-icons/tb'

export function CaixaEstacaoNaoVinculada({
  onAbrirConfiguracao,
}: {
  onAbrirConfiguracao: () => void
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <TbCashRegister className="h-7 w-7" aria-hidden />
      </div>
      <p className="text-sm font-semibold text-primary-text">Estação não configurada neste computador</p>
      <p className="mx-auto mt-2 max-w-[18rem] text-xs leading-relaxed text-secondary-text">
        Vincule a estação em Configurações do delivery. O caixa usa a mesma estação deste PC.
      </p>
      <button
        type="button"
        onClick={onAbrirConfiguracao}
        className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        <MdSettings className="h-4 w-4" aria-hidden />
        Ir para configuração
      </button>
    </div>
  )
}
