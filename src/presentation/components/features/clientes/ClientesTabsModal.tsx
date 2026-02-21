'use client'

import { Dialog, DialogContent } from '@/src/presentation/components/ui/dialog'
import { NovoCliente } from './NovoCliente'
import { VisualizarCliente } from './VisualizarCliente'

type TabKey = 'cliente' | 'visualizar'

export interface ClientesTabsModalState {
  open: boolean
  tab: TabKey
  mode: 'create' | 'edit' | 'view'
  clienteId?: string
}

interface ClientesTabsModalProps {
  state: ClientesTabsModalState
  onClose: () => void
  onReload?: () => void
  onTabChange: (tab: TabKey) => void
}

export function ClientesTabsModal({
  state,
  onClose,
  onReload,
  onTabChange,
}: ClientesTabsModalProps) {
  const clienteId = state.clienteId

  const handleEdit = () => {
    onTabChange('cliente')
  }

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
          zIndex: 1500,
          justifyContent: {
            xs: 'center', // Centraliza em mobile
            md: 'flex-end', // Alinha à direita em desktop
          },
          alignItems: 'stretch',
          margin: 0,
        },
        '& .MuiBackdrop-root': { zIndex: 1500 },
        '& .MuiDialog-paper': { zIndex: 1500 },
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
        <div className="px-6 pt-4 flex gap-1 border-b border-gray-200">
          {(
            [
              { key: 'cliente' as TabKey, label: 'Cliente', disabled: false },
              {
                key: 'visualizar' as TabKey,
                label: 'Visualizar',
                disabled: state.mode === 'create' || !clienteId,
              },
            ] as Array<{
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
          {state.tab === 'cliente' && (
            <div className="h-full overflow-y-auto">
              <NovoCliente
                clienteId={state.mode === 'create' ? undefined : clienteId}
                isEmbedded
                onClose={onClose}
                onSaved={() => {
                  onReload?.()
                  onClose()
                }}
              />
            </div>
          )}
          {state.tab === 'visualizar' && clienteId && (
            <div className="h-full overflow-y-auto">
              <VisualizarCliente
                clienteId={clienteId}
                isEmbedded
                onClose={onClose}
                onEdit={handleEdit}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

