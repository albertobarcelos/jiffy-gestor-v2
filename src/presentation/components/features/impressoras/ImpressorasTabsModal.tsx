'use client'

import { Dialog, DialogContent } from '@/src/presentation/components/ui/dialog'
import { NovaImpressora } from './NovaImpressora'

type TabKey = 'impressora'

export interface ImpressorasTabsModalState {
  open: boolean
  tab: TabKey
  mode: 'create' | 'edit'
  impressoraId?: string
}

interface ImpressorasTabsModalProps {
  state: ImpressorasTabsModalState
  onClose: () => void
  onReload?: () => void
  onTabChange: (tab: TabKey) => void
}

export function ImpressorasTabsModal({
  state,
  onClose,
  onReload,
  onTabChange,
}: ImpressorasTabsModalProps) {
  const impressoraId = state.impressoraId

  // Debug: verificar se o modal está sendo renderizado
  console.log('ImpressorasTabsModal renderizado - state:', state)

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
        zIndex: '2000 !important', // z-index muito alto para aparecer sobre todos os modais
        '& .MuiDialog-container': {
          justifyContent: 'flex-end',
          alignItems: 'stretch',
          margin: 0,
          zIndex: 2000,
        },
        '& .MuiBackdrop-root': {
          zIndex: '1999 !important', // backdrop um nível abaixo do modal
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
          zIndex: '2000 !important', // z-index muito alto para o Paper também
        },
      }}
    >
      <DialogContent sx={{ p: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="px-6 pt-4 flex gap-1 border-b border-gray-200">
          {(
            [{ key: 'impressora', label: 'Impressora', disabled: false }] as Array<{
              key: TabKey
              label: string
              disabled: boolean
            }>
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              disabled={tab.disabled}
              onClick={() => !tab.disabled && onTabChange(tab.key)}
              className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition-colors ${
                state.tab === tab.key
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-secondary-text hover:bg-gray-200'
              } ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden">
          {state.tab === 'impressora' && (
            <div className="h-full overflow-y-auto">
              <NovaImpressora
                impressoraId={state.mode === 'create' ? undefined : impressoraId}
                isEmbedded
                onClose={onClose}
                onSaved={() => {
                  onReload?.()
                  onClose()
                }}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

