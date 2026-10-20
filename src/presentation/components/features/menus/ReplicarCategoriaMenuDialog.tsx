'use client'

import { Dialog, DialogContent } from '@/src/presentation/components/ui/dialog'

interface ReplicarCategoriaMenuDialogProps {
  open: boolean
  ativo: boolean
  nomeCategoria: string
  busy?: boolean
  onSomenteAqui: () => void
  onReplicar: () => void
}

export function ReplicarCategoriaMenuDialog({
  open,
  ativo,
  nomeCategoria,
  busy = false,
  onSomenteAqui,
  onReplicar,
}: ReplicarCategoriaMenuDialogProps) {
  const acao = ativo ? 'ativada' : 'desativada'
  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        if (busy || nextOpen) return
        onSomenteAqui()
      }}
      maxWidth={false}
      fullWidth={false}
      sx={{
        zIndex: 2100,
        '& .MuiDialog-paper': {
          margin: 16,
          width: '100%',
          maxWidth: 400,
          borderRadius: '16px',
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <div className="px-5 pb-5 pt-6 text-center">
          <h2 className="text-base font-semibold leading-snug text-primary-text">
            Replicar nos outros cardápios?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-secondary-text">
            {nomeCategoria} foi {acao} somente neste cardápio. Deseja aplicar a mesma alteração nos
            outros menus?
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={onReplicar}
              disabled={busy}
              className="min-h-[48px] w-full rounded-xl bg-primary px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? 'Aguarde…' : 'Sim, replicar'}
            </button>
            <button
              type="button"
              onClick={onSomenteAqui}
              disabled={busy}
              className="min-h-[48px] w-full rounded-xl border border-primary/40 px-4 text-sm font-semibold text-primary disabled:opacity-60"
            >
              Não, só aqui
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
