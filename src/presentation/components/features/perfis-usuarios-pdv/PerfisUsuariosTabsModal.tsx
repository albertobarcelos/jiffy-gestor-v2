'use client'

import { useMemo } from 'react'
import { Dialog, DialogContent } from '@/src/presentation/components/ui/dialog'
import { NovoPerfilUsuario } from './NovoPerfilUsuario'

type TabKey = 'perfil'

export interface PerfisUsuariosTabsModalState {
  open: boolean
  tab: TabKey
  mode: 'create' | 'edit'
  perfilId?: string
}

interface PerfisUsuariosTabsModalProps {
  state: PerfisUsuariosTabsModalState
  onClose: () => void
  onTabChange: (tab: TabKey) => void
  onReload?: () => void
}

export function PerfisUsuariosTabsModal({
  state,
  onClose,
  onTabChange,
  onReload,
}: PerfisUsuariosTabsModalProps) {
  const title = useMemo(() => {
    return state.mode === 'create' ? 'Novo Perfil' : 'Editar Perfil'
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
        <div className="px-6 pt-2 flex gap-1 border-b border-gray-100 bg-white">
          <button
            type="button"
            onClick={() => onTabChange('perfil')}
            className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition-colors ${
              state.tab === 'perfil'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-secondary-text hover:bg-gray-200'
            }`}
          >
            Perfil
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {state.tab === 'perfil' && (
            <div className="h-full overflow-y-auto">
              <NovoPerfilUsuario
                perfilId={state.mode === 'edit' ? state.perfilId : undefined}
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

