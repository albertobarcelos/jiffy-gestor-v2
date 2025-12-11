'use client'

import { useMemo, useState } from 'react'
import { MdAdd, MdSearch } from 'react-icons/md'
import { Complemento } from '@/src/domain/entities/Complemento'
import { Button } from '@/src/presentation/components/ui/button'

interface ComplementosSelectModalProps {
  open: boolean
  title?: string
  complementos: Complemento[]
  selectedIds: string[]
  isLoading?: boolean
  onToggle: (id: string) => void
  onConfirm: () => void
  onClose: () => void
  onCreateComplemento?: () => void
  confirmLabel?: string
  emptyMessage?: string
}

/**
 * Modal reutilizável para listar e selecionar complementos.
 */
export function ComplementosSelectModal({
  open,
  title = 'Selecionar Complementos',
  complementos,
  selectedIds,
  isLoading = false,
  onToggle,
  onConfirm,
  onClose,
  onCreateComplemento,
  confirmLabel = 'Vincular selecionados',
  emptyMessage = 'Nenhum complemento disponível para adicionar.',
}: ComplementosSelectModalProps) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return complementos
    return complementos.filter((item) => {
      const nome = item.getNome()?.toLowerCase() || ''
      const descricao = item.getDescricao()?.toLowerCase() || ''
      return nome.includes(term) || descricao.includes(term)
    })
  }, [complementos, search])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50 px-4">
      <div className="bg-info rounded-lg p-6 w-full max-w-xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4 gap-2">
          <h3 className="text-xl font-semibold text-primary-text">{title}</h3>
          <div className="flex items-center gap-2">
            {onCreateComplemento && (
              <button
                type="button"
                onClick={onCreateComplemento}
                title="Criar novo complemento"
                className="inline-flex items-center h-8 gap-2 px-2 py-2 rounded-lg bg-primary text-info text-sm font-normal shadow hover:bg-primary/90 transition-colors"
              >
                <MdAdd className="text-lg" />
                Criar novo complemento
              </button>
            )}
            
          </div>
        </div>

        <div className="px-1">
          <label className="text-xs font-semibold text-secondary-text my-2 block">
            Buscar complemento disponível
          </label>
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Digite para filtrar..."
              className="w-full h-8 rounded-lg border border-gray-200 bg-primary-bg pl-11 pr-4 text-sm text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-primary"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-text">
              <MdSearch size={18} />
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-1 py-4 space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-secondary-text text-sm">{emptyMessage}</p>
          ) : (
            filtered.map((item) => {
              const id = item.getId()
              const isSelected = selectedIds.includes(id)
              return (
                <label
                  key={id}
                  className={`flex items-start gap-3 p-2 rounded-lg border transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent bg-primary-bg hover:bg-primary-bg/80'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(id)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-primary-text">{item.getNome()}</p>
                      <div className="text-right">
                        {item.getValor() > 0 && (
                          <p className="text-xs font-semibold text-primary-text">
                            R$ {item.getValor().toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                    {(item.getDescricao() || item.getTipoImpactoPreco?.()) && (
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <p className="text-xs text-secondary-text">
                          {item.getDescricao() || 'Sem descrição'}
                        </p>
                        {item.getTipoImpactoPreco?.() && (
                          <p className="text-[11px] font-semibold text-primary uppercase tracking-wide">
                            {item.getTipoImpactoPreco()}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </label>
              )
            })
          )}
        </div>

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-primary">
          <Button type="button" onClick={onClose} variant="outlined"
          className="h-8 hover:bg-primary/20"
          sx={{
            backgroundColor: 'var(--color-info)',
            color: 'var(--color-primary)',
            borderColor: 'var(--color-primary)',
            border: '1px solid',
          }}
          >
            Fechar
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={selectedIds.length === 0}
            className="h-8 hover:bg-primary/90"
            sx={{
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-info)',
              borderColor: 'var(--color-primary)',
              border: '1px solid',
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

