'use client'

import { useMemo } from 'react'
import { Dialog, DialogContent } from '@/src/presentation/components/ui/dialog'
import { NovoUsuarioGestor } from './NovoUsuarioGestor'

type TabKey = 'usuario'

export interface UsuariosGestorTabsModalState {
  open: boolean
  tab: TabKey
  mode: 'create' | 'edit'
  usuarioId?: string
  initialPerfilGestorId?: string
}

interface UsuariosGestorTabsModalProps {
  state: UsuariosGestorTabsModalState
  onClose: () => void
  onTabChange: (tab: TabKey) => void
  onReload?: () => void
}

export function UsuariosGestorTabsModal({
  state,
  onClose,
  onTabChange,
  onReload,
}: UsuariosGestorTabsModalProps) {
  const title = useMemo(() => {
    return state.mode === 'create' ? 'Novo Usuário Gestor' : 'Editar Usuário Gestor'
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
            xs: 'center',
            md: 'flex-end',
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
            xs: '95vw',
            sm: '90vw',
            md: 'min(900px, 60vw)',
          },
          margin: {
            xs: 'auto',
            md: 0,
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
            onClick={() => onTabChange('usuario')}
            className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition-colors ${
              state.tab === 'usuario'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-secondary-text hover:bg-gray-200'
            }`}
          >
            Usuário
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {state.tab === 'usuario' && (
            <div className="h-full overflow-y-auto">
              <NovoUsuarioGestor
                usuarioId={state.mode === 'edit' ? state.usuarioId : undefined}
                initialPerfilGestorId={state.initialPerfilGestorId}
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
