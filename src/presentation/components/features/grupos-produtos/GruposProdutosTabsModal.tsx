'use client'

import { Dialog, DialogContent } from '@/src/presentation/components/ui/dialog'
import { NovoGrupo } from './NovoGrupo'

type TabKey = 'grupo'

export interface GruposProdutosTabsModalState {
  open: boolean
  tab: TabKey
  mode: 'create' | 'edit'
  grupoId?: string
  initialTab?: number // 0 = Detalhes do Grupo, 1 = Produtos Vinculados
}

interface GruposProdutosTabsModalProps {
  state: GruposProdutosTabsModalState
  onClose: () => void
  onReload?: () => void
  onTabChange: (tab: TabKey) => void
}

export function GruposProdutosTabsModal({
  state,
  onClose,
  onReload,
  onTabChange,
}: GruposProdutosTabsModalProps) {
  const grupoId = state.grupoId

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
        <div className="px-6 pt-4 flex gap-1 border-b border-gray-200">
          {(
            [{ key: 'grupo', label: 'Grupo', disabled: false }] as Array<{
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
          {state.tab === 'grupo' && (
            <div className="h-full overflow-y-auto">
              <NovoGrupo
                key={`grupo-${grupoId || 'new'}-tab-${state.initialTab ?? 0}`}
                grupoId={state.mode === 'create' ? undefined : grupoId}
                isEmbedded
                onClose={onClose}
                onSaved={() => {
                  onReload?.()
                  onClose()
                }}
                initialTab={state.initialTab}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}


