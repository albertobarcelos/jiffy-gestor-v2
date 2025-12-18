'use client'

import { useMemo } from 'react'
import { Dialog, DialogContent } from '@/src/presentation/components/ui/dialog'
import { EditarTerminais } from './EditarTerminais'

type TabKey = 'terminal'

export interface TerminaisTabsModalState {
  open: boolean
  tab: TabKey
  mode: 'edit'
  terminalId?: string
}

interface TerminaisTabsModalProps {
  state: TerminaisTabsModalState
  onClose: () => void
  onTabChange: (tab: TabKey) => void
  onReload?: () => void
}

export function TerminaisTabsModal({
  state,
  onClose,
  onTabChange,
  onReload,
}: TerminaisTabsModalProps) {
  const title = useMemo(() => {
    return 'Editar Terminal'
  }, [])

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
        <div className="px-6 pt-2 flex gap-1 border-b border-gray-100 bg-white">
          <button
            type="button"
            onClick={() => onTabChange('terminal')}
            className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition-colors ${
              state.tab === 'terminal'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-secondary-text hover:bg-gray-200'
            }`}
          >
            Terminal
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {state.tab === 'terminal' && state.terminalId && (
            <div className="h-full overflow-y-auto">
              <EditarTerminais
                terminalId={state.terminalId}
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

