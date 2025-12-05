'use client'

import { useMemo } from 'react'
import { Dialog, DialogContent } from '@/src/presentation/components/ui/dialog'
import { NovoMeioPagamento } from './NovoMeioPagamento'

type TabKey = 'meio-pagamento'

export interface MeiosPagamentosTabsModalState {
  open: boolean
  tab: TabKey
  mode: 'create' | 'edit'
  meioPagamentoId?: string
}

interface MeiosPagamentosTabsModalProps {
  state: MeiosPagamentosTabsModalState
  onClose: () => void
  onTabChange: (tab: TabKey) => void
  onReload?: () => void
}

export function MeiosPagamentosTabsModal({
  state,
  onClose,
  onTabChange,
  onReload,
}: MeiosPagamentosTabsModalProps) {
  const title = useMemo(() => {
    return state.mode === 'create' ? 'Novo Meio de Pagamento' : 'Editar Meio de Pagamento'
  }, [state.mode])

  return (
    <Dialog
      open={state.open}
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
      fullWidth
      maxWidth="xl"
      sx={{
        '& .MuiDialog-container': {
          justifyContent: 'flex-end',
          alignItems: 'stretch',
          margin: 0,
        },
      }}
      PaperProps={{
        sx: {
          m: 0,
          height: '100vh',
          maxHeight: '100vh',
          width: 'min(900px, 60vw)',
          borderRadius: 0,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <DialogContent sx={{ p: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="px-6 pt-6 flex gap-1 border-b border-gray-100 bg-white">
          <button
            type="button"
            onClick={() => onTabChange('meio-pagamento')}
            className={`px-4 py-2 rounded-t-[14px] text-sm font-semibold transition-colors ${
              state.tab === 'meio-pagamento'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-secondary-text hover:bg-gray-200'
            }`}
          >
            Meio de Pagamento
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {state.tab === 'meio-pagamento' && (
            <div className="h-full overflow-y-auto">
              <NovoMeioPagamento
                meioPagamentoId={state.mode === 'edit' ? state.meioPagamentoId : undefined}
                isEmbedded
                onSaved={() => {
                  onReload?.()
                  onClose()
                }}
                onCancel={onClose}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

