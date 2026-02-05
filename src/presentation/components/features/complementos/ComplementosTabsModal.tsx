'use client'

import { useMemo } from 'react'
import { Dialog, DialogContent } from '@/src/presentation/components/ui/dialog'
import { NovoComplemento } from './NovoComplemento'

type TabKey = 'complemento'

export interface ComplementosTabsModalState {
  open: boolean
  tab: TabKey
  mode: 'create' | 'edit'
  complementoId?: string
}

interface ComplementosTabsModalProps {
  state: ComplementosTabsModalState
  onClose: () => void
  onTabChange: (tab: TabKey) => void
  onReload?: () => void
}

export function ComplementosTabsModal({
  state,
  onClose,
  onTabChange,
  onReload,
}: ComplementosTabsModalProps) {
  const title = useMemo(() => {
    return state.mode === 'create' ? 'Novo Complemento' : 'Editar Complemento'
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
          justifyContent: {
            xs: 'center', // Centraliza em mobile
            md: 'flex-end', // Alinha à direita em desktop
          },
          alignItems: 'stretch',
          margin: 0,
        },
      }}
      PaperProps={{
        sx: {
          height: '100vh',
          maxHeight: '100vh',
          width: {
            xs: '95vw', // Em telas muito pequenas (mobile), ocupa 95% da largura
            sm: '90vw', // Em telas pequenas, ocupa 90% da largura
            md: 'min(900px, 60vw)', // Em telas médias e maiores, mantém o comportamento original
          },
          margin: {
            xs: 'auto', // Centraliza em mobile (com width 95vw, deixa 2.5% de cada lado)
            md: 0, // Sem margin em desktop
          },
          borderRadius: 0,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <DialogContent sx={{ p: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="px-6 pt-2 flex gap-1 border-b border-gray-100 bg-white">
          <button
            type="button"
            onClick={() => onTabChange('complemento')}
            className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition-colors ${
              state.tab === 'complemento'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-secondary-text hover:bg-gray-200'
            }`}
          >
            Complemento
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {state.tab === 'complemento' && (
            <div className="h-full overflow-y-auto">
              <NovoComplemento
                complementoId={state.mode === 'edit' ? state.complementoId : undefined}
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


