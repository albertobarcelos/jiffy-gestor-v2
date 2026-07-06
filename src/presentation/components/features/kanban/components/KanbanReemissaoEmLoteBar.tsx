'use client'

import { MdPause, MdPlayArrow, MdStop } from 'react-icons/md'
import { JiffyConfirmDialog } from '@/src/presentation/components/ui/jiffy-confirm-dialog'
import type { ReemissaoFiscalLoteProgresso } from '../hooks/useReemissaoFiscalEmLote'

interface KanbanReemissaoEmLoteBarProps {
  totalElegiveis: number
  progresso: ReemissaoFiscalLoteProgresso
  intervaloSegundos: number
  confirmacaoAberta: boolean
  onConfirmacaoAbertaChange: (open: boolean) => void
  onIniciar: () => void
  onConfirmarInicio: () => void
  onPausar: () => void
  onRetomar: () => void
  onParar: () => void
  onEncerrarResumo: () => void
}

export function KanbanReemissaoEmLoteBar({
  totalElegiveis,
  progresso,
  intervaloSegundos,
  confirmacaoAberta,
  onConfirmacaoAbertaChange,
  onIniciar,
  onConfirmarInicio,
  onPausar,
  onRetomar,
  onParar,
  onEncerrarResumo,
}: KanbanReemissaoEmLoteBarProps) {
  const emAndamento = progresso.status === 'running' || progresso.status === 'paused'
  const processadas = progresso.enviadas + progresso.erros

  return (
    <>
      <div className="border-t border-yellow-300 bg-yellow-100/80 px-2 py-2">
        {!emAndamento && progresso.status !== 'concluido' ? (
          <button
            type="button"
            className="w-full rounded-md bg-[#003366] px-2 py-1.5 text-[11px] font-medium text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={totalElegiveis === 0}
            onClick={onIniciar}
            title={`Envia 1 nota a cada ${intervaloSegundos}s para evitar timeout no fiscal`}
          >
            Reemitir em lote ({totalElegiveis})
          </button>
        ) : progresso.status === 'concluido' ? (
          <div className="space-y-1">
            <p className="text-center text-[11px] font-medium text-gray-800">
              Concluído: {progresso.enviadas} enviada(s)
              {progresso.erros > 0 ? ` · ${progresso.erros} erro(s)` : ''}
            </p>
            <button
              type="button"
              className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
              onClick={onEncerrarResumo}
            >
              Fechar
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            <p className="text-center text-[11px] font-medium text-gray-800">
              {progresso.status === 'paused' ? 'Pausado · ' : ''}
              {processadas} de {progresso.totalElegiveisVisiveis || totalElegiveis}
              {progresso.vendaAtualLabel ? ` · ${progresso.vendaAtualLabel}` : ''}
            </p>
            <div className="flex gap-1">
              {progresso.status === 'paused' ? (
                <button
                  type="button"
                  className="flex flex-1 items-center justify-center gap-0.5 rounded-md bg-[#003366] px-2 py-1 text-[11px] font-medium text-white hover:brightness-95"
                  onClick={onRetomar}
                >
                  <MdPlayArrow className="h-3.5 w-3.5" />
                  Retomar
                </button>
              ) : (
                <button
                  type="button"
                  className="flex flex-1 items-center justify-center gap-0.5 rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
                  onClick={onPausar}
                >
                  <MdPause className="h-3.5 w-3.5" />
                  Pausar
                </button>
              )}
              <button
                type="button"
                className="flex flex-1 items-center justify-center gap-0.5 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-100"
                onClick={onParar}
              >
                <MdStop className="h-3.5 w-3.5" />
                Parar
              </button>
            </div>
          </div>
        )}
      </div>

      <JiffyConfirmDialog
        open={confirmacaoAberta}
        onOpenChange={open => onConfirmacaoAbertaChange(open)}
        title="Reemitir notas em lote?"
        description={
          <>
            Serão enviadas <strong>{totalElegiveis}</strong> reemissões visíveis nesta coluna,{' '}
            <strong>1 por vez</strong>, com intervalo de <strong>{intervaloSegundos} segundos</strong>{' '}
            entre cada envio — para evitar timeout no fiscal.
            <br />
            <br />
            Você pode pausar ou parar a qualquer momento. Vendas que exigem modal (sem documento
            fiscal) serão ignoradas.
          </>
        }
        cancelLabel="Cancelar"
        confirmLabel="Iniciar lote"
        onConfirm={onConfirmarInicio}
      />
    </>
  )
}
