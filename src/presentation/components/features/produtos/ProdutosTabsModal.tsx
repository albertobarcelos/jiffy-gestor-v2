'use client'

import { useMemo } from 'react'
import { Dialog, DialogContent } from '@/src/presentation/components/ui/dialog'
import { Produto } from '@/src/domain/entities/Produto'
import { NovoProduto } from './NovoProduto'
import { ComplementosMultiSelectDialog } from './ComplementosMultiSelectDialog'
import { ProdutoImpressorasDialog } from './ProdutoImpressorasDialog'
import { NovoGrupo } from '../grupos-produtos/NovoGrupo'

type TabKey = 'produto' | 'complementos' | 'impressoras' | 'grupo'

export interface ProdutosTabsModalState {
  open: boolean
  tab: TabKey
  mode: 'create' | 'edit' | 'copy'
  produto?: Produto
  prefillGrupoProdutoId?: string
  grupoId?: string
}

interface ProdutosTabsModalProps {
  state: ProdutosTabsModalState
  onClose: () => void
  onReload?: () => void
  onTabChange: (tab: TabKey) => void
}

export function ProdutosTabsModal({ state, onClose, onReload, onTabChange }: ProdutosTabsModalProps) {
  const produtoId = state.produto?.getId()

  const title = useMemo(() => {
    if (state.tab === 'produto') {
      switch (state.mode) {
        case 'create':
          return 'Novo Produto'
        case 'copy':
          return 'Copiar Produto'
        case 'edit':
        default:
          return 'Editar Produto'
      }
    }
    if (state.tab === 'complementos') {
      return state.produto ? `Complementos de ${state.produto.getNome()}` : 'Complementos'
    }
    if (state.tab === 'impressoras') {
      return state.produto ? `Impressoras de ${state.produto.getNome()}` : 'Impressoras'
    }
    return state.grupoId ? 'Editar Grupo' : 'Grupo de Produtos'
  }, [state])

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
          width: 'min(950px, 65vw)',
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
              { key: 'produto', label: 'Produto', disabled: false },
              { key: 'complementos', label: 'Complementos', disabled: !produtoId },
              { key: 'impressoras', label: 'Impressoras', disabled: !produtoId },
              { key: 'grupo', label: 'Grupo', disabled: !state.grupoId },
            ] as Array<{ key: TabKey; label: string; disabled: boolean }>
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              disabled={tab.disabled}
              onClick={() => !tab.disabled && onTabChange(tab.key)}
              className={`px-4 py-2 rounded-t-[14px] text-sm font-semibold transition-colors ${
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
          {state.tab === 'produto' && (
            <div className="h-full overflow-y-auto">
              <NovoProduto
                produtoId={state.mode === 'create' ? undefined : produtoId}
                isCopyMode={state.mode === 'copy'}
                defaultGrupoProdutoId={state.mode === 'create' ? state.prefillGrupoProdutoId : undefined}
                onClose={onClose}
                onSuccess={() => {
                  onReload?.()
                  onClose()
                }}
              />
            </div>
          )}

          {state.tab === 'complementos' && (
            <div className="h-full overflow-y-auto">
              {produtoId ? (
                <ComplementosMultiSelectDialog
                  open={true}
                  produtoId={produtoId}
                  produtoNome={state.produto?.getNome()}
                  onClose={onClose}
                  isEmbedded
                />
              ) : (
                <div className="h-full flex items-center justify-center text-secondary-text text-sm">
                  Selecione um produto para gerenciar complementos.
                </div>
              )}
            </div>
          )}

          {state.tab === 'impressoras' && (
            <div className="h-full overflow-y-auto">
              {produtoId ? (
                <ProdutoImpressorasDialog
                  open={true}
                  produtoId={produtoId}
                  produtoNome={state.produto?.getNome()}
                  onClose={onClose}
                  isEmbedded
                />
              ) : (
                <div className="h-full flex items-center justify-center text-secondary-text text-sm">
                  Selecione um produto para gerenciar impressoras.
                </div>
              )}
            </div>
          )}

          {state.tab === 'grupo' && (
            <div className="h-full overflow-y-auto">
              {state.grupoId ? (
                <NovoGrupo
                  grupoId={state.grupoId}
                  isEmbedded
                  onClose={onClose}
                  onSaved={() => {
                    onReload?.()
                    onClose()
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-secondary-text text-sm">
                  Selecione um grupo válido para editar.
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}


