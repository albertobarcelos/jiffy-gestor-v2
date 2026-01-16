'use client'

import { useMemo } from 'react'
import { Dialog, DialogContent } from '@/src/presentation/components/ui/dialog'
import { GrupoComplemento } from '@/src/domain/entities/GrupoComplemento'
import { NovoGrupoComplemento } from './NovoGrupoComplemento'
import { GrupoComplementoComplementosModal } from './GrupoComplementoComplementosModal'

type TabKey = 'grupo' | 'complementos'

export interface GruposComplementosTabsModalState {
  open: boolean
  tab: TabKey
  mode: 'create' | 'edit'
  grupo?: GrupoComplemento
}

interface GruposComplementosTabsModalProps {
  state: GruposComplementosTabsModalState
  onClose: () => void
  onTabChange: (tab: TabKey) => void
  onReload?: () => void
}

export function GruposComplementosTabsModal({
  state,
  onClose,
  onTabChange,
  onReload,
}: GruposComplementosTabsModalProps) {
  const grupoId = state.grupo?.getId()


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
          width: 'min(900px, 58vw)',
          borderRadius: 0,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <DialogContent sx={{ p: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="px-6 pt-2 flex gap-1 border-b border-gray-100 bg-white">
          {(
            [
              { key: 'grupo', label: 'Grupo', disabled: false },
              { key: 'complementos', label: 'Complementos', disabled: !grupoId },
            ] as Array<{ key: TabKey; label: string; disabled: boolean }>
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
              <NovoGrupoComplemento
                grupoId={state.mode === 'create' ? undefined : grupoId}
                isEmbedded
                onClose={onClose}
                onSaved={() => {
                  onReload?.()
                  onClose()
                }}
              />
            </div>
          )}

          {state.tab === 'complementos' && (
            <div className="h-full overflow-hidden">
              {grupoId && state.grupo ? (
                <GrupoComplementoComplementosModal
                  isEmbedded
                  grupo={state.grupo}
                  onClose={onClose}
                  onUpdated={onReload}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-secondary-text text-sm">
                  Selecione um grupo válido para gerenciar complementos.
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}


