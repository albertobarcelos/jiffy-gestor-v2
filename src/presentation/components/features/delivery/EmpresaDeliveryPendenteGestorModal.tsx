'use client'

import { MdClose } from 'react-icons/md'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent } from '@/src/presentation/components/ui/dialog'
import { useGestaoPath } from '@/src/presentation/hooks/useGestaoPath'
import { deliveryHubEtapaPath } from '@/src/shared/constants/configuracoesRoutes'

type EmpresaDeliveryPendenteGestorModalProps = {
  open: boolean
  onClose: () => void
  /** Itens que ainda faltam (texto amigável). */
  pendenciasLabels?: string[]
}

/**
 * Aviso bloqueante: venda delivery no gestor exige Empresa Delivery (slug) + menu.
 */
export function EmpresaDeliveryPendenteGestorModal({
  open,
  onClose,
  pendenciasLabels = [],
}: EmpresaDeliveryPendenteGestorModalProps) {
  const router = useRouter()
  const { toGestao } = useGestaoPath()

  const handleConfigurar = () => {
    onClose()
    router.push(toGestao(deliveryHubEtapaPath('delivery-nome-cardapio')))
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen, reason) => {
        if (nextOpen) return
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') onClose()
      }}
      maxWidth={false}
      fullWidth={false}
      sx={{
        zIndex: 2200,
        '& .MuiDialog-container': {
          alignItems: 'center',
          justifyContent: 'center',
        },
        '& .MuiDialog-paper': {
          margin: 16,
          width: '100%',
          maxWidth: 420,
          borderRadius: '16px',
          overflow: 'visible',
          boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
        },
      }}
    >
      <DialogContent sx={{ p: 0, position: 'relative' }}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1 text-secondary-text transition-colors hover:bg-black/5 hover:text-primary-text"
          aria-label="Fechar"
        >
          <MdClose className="h-5 w-5" />
        </button>

        <div className="px-5 pb-5 pt-8 text-center">
          <div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary/30 bg-white text-primary"
            aria-hidden
          >
            <span className="text-2xl font-bold leading-none">!</span>
          </div>

          <h2 className="mt-5 text-base font-semibold leading-snug text-primary-text">
            Quase lá! Falta ativar o delivery
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-secondary-text">
            Clique no botão abaixo para ativá-lo.
          </p>

          {pendenciasLabels.length > 0 ? (
            <ul className="mt-4 space-y-1.5 rounded-xl bg-gray-50 px-4 py-3 text-left text-sm text-primary-text">
              {pendenciasLabels.map(label => (
                <li key={label} className="flex gap-2">
                  <span className="mt-0.5 font-bold text-primary" aria-hidden>
                    •
                  </span>
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <button
            type="button"
            onClick={handleConfigurar}
            className="mt-6 min-h-[48px] w-full rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-alternate"
          >
            Ir para ativar delivery
          </button>

          <button
            type="button"
            onClick={onClose}
            className="mt-2 min-h-[40px] w-full rounded-xl px-4 text-sm font-medium text-secondary-text transition-colors hover:bg-gray-50 hover:text-primary-text"
          >
            Continuar só com balcão
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
