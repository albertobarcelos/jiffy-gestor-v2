'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogContent } from '@/src/presentation/components/ui/dialog'
import { NovaImpressora } from './NovaImpressora'

type TabKey = 'impressora'

export interface ImpressorasTabsModalState {
  open: boolean
  tab: TabKey
  mode: 'create' | 'edit' | 'copy'
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
  const handleRequestCloseRef = useRef<(() => void) | null>(null)

  // Debug: verificar se o modal está sendo renderizado
  console.log('ImpressorasTabsModal renderizado - state:', state)

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Se houver uma função de verificação de mudanças, usa ela
      if (handleRequestCloseRef.current) {
        handleRequestCloseRef.current()
      } else {
        // Caso contrário, fecha normalmente
        onClose()
      }
    }
  }

  return (
    <Dialog
      open={state.open}
      onOpenChange={handleOpenChange}
      fullWidth
      maxWidth="xl"
      sx={{
        zIndex: '2000 !important', // z-index muito alto para aparecer sobre todos os modais
        '& .MuiDialog-container': {
          justifyContent: {
            xs: 'center', // Centraliza em mobile
            md: 'flex-end', // Alinha à direita em desktop
          },
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
                isCopyMode={state.mode === 'copy'}
                isEmbedded
                onClose={onClose}
                onSaved={() => {
                  onReload?.()
                  onClose()
                }}
                onRequestClose={(callback) => {
                  handleRequestCloseRef.current = callback
                }}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

