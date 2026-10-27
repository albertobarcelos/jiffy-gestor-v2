'use client'

import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { MdAdd, MdDeleteOutline } from 'react-icons/md'
import { Button } from '@/src/presentation/components/ui/button'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import {
  formatPizzaMoney,
  type PizzaCategoriaDraft,
  type PizzaSaborDraft,
  type PizzaTamanhoDraft,
} from './pizzaDefaults'
import {
  PizzaSaborDraftFormCard,
  type PizzaSaborDraftFormCardHandle,
} from './PizzaSaborDraftFormCard'

interface PizzaCategoriaSaboresStepProps {
  draft: PizzaCategoriaDraft
  onChange: (draft: PizzaCategoriaDraft) => void
}

export interface PizzaCategoriaSaboresStepHandle {
  /** Retorna true se pode sair do passo (auto-adiciona sabor completo se houver). */
  tryFlushBeforeLeave: () => boolean
}

type FormMode = 'closed' | 'create' | 'edit'

function resumoPrecosPorTamanho(sabor: PizzaSaborDraft, tamanhos: PizzaTamanhoDraft[]) {
  const partes = tamanhos
    .map(tamanho => {
      const cfg = sabor.precosPorTamanhoLocalId[tamanho.localId]
      if (!cfg?.enabled || cfg.valor <= 0) return null
      const nome = tamanho.nome.trim() || 'Tamanho'
      return `${nome} ${formatPizzaMoney(cfg.valor)}`
    })
    .filter((parte): parte is string => parte != null)

  if (partes.length === 0) return 'Sem preço'
  return partes.join('  -  ')
}

export const PizzaCategoriaSaboresStep = forwardRef<
  PizzaCategoriaSaboresStepHandle,
  PizzaCategoriaSaboresStepProps
>(function PizzaCategoriaSaboresStep({ draft, onChange }, ref) {
  const [formMode, setFormMode] = useState<FormMode>('closed')
  const [editingLocalId, setEditingLocalId] = useState<string | null>(null)
  const formCardRef = useRef<PizzaSaborDraftFormCardHandle>(null)

  const tamanhosAtivos = useMemo(
    () => draft.tamanhos.filter(t => t.nome.trim() && t.ativo),
    [draft.tamanhos]
  )

  const editingSabor = useMemo(
    () =>
      formMode === 'edit' && editingLocalId
        ? (draft.sabores.find(item => item.localId === editingLocalId) ?? null)
        : null,
    [draft.sabores, editingLocalId, formMode]
  )

  const formAberto = formMode === 'create' || (formMode === 'edit' && editingSabor != null)

  const abrirNovo = () => {
    setEditingLocalId(null)
    setFormMode('create')
  }

  const abrirEdicao = (sabor: PizzaSaborDraft) => {
    setEditingLocalId(sabor.localId)
    setFormMode('edit')
  }

  const fecharForm = () => {
    setFormMode('closed')
    setEditingLocalId(null)
  }

  const handleSaveSabor = (sabor: PizzaSaborDraft) => {
    const exists = draft.sabores.some(item => item.localId === sabor.localId)
    onChange({
      ...draft,
      sabores: exists
        ? draft.sabores.map(item => (item.localId === sabor.localId ? sabor : item))
        : [sabor, ...draft.sabores],
    })
    fecharForm()
  }

  const removerSabor = (localId: string) => {
    if (editingLocalId === localId) {
      fecharForm()
    }
    onChange({
      ...draft,
      sabores: draft.sabores.filter(item => item.localId !== localId),
    })
  }

  useImperativeHandle(
    ref,
    () => ({
      tryFlushBeforeLeave: () => {
        if (!formAberto) return true
        const result = formCardRef.current?.tryCommitOnLeave() ?? 'idle'
        if (result === 'incomplete') return false
        if (result === 'idle') {
          fecharForm()
        }
        return true
      },
    }),
    [formAberto]
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
      <h2 className="text-base font-semibold text-primary-text">Sabores</h2>

      {tamanhosAtivos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-secondary-text">
          Configure ao menos um tamanho ativo no passo anterior para cadastrar sabores com preço.
        </p>
      ) : null}

      {formMode === 'create' || (formMode === 'edit' && editingSabor) ? (
        <PizzaSaborDraftFormCard
          key={editingSabor?.localId ?? 'novo'}
          ref={formCardRef}
          tamanhos={draft.tamanhos}
          initial={editingSabor}
          onSave={handleSaveSabor}
          onCancel={fecharForm}
        />
      ) : (
        <Button
          type="button"
          variant="contained"
          fullWidth
          onClick={abrirNovo}
          disabled={tamanhosAtivos.length === 0}
          sx={{
            backgroundColor: 'var(--color-primary)',
            color: '#fff',
            '&:hover': {
              backgroundColor: 'var(--color-primary)',
              filter: 'brightness(0.92)',
            },
            '&.Mui-disabled': {
              backgroundColor: 'var(--color-primary)',
              color: '#fff',
              opacity: 0.5,
            },
          }}
        >
          <MdAdd className="mr-1" /> Novo sabor
        </Button>
      )}

      {draft.sabores.length === 0 ? (
        <p className="text-sm text-secondary-text">Nenhum sabor adicionado ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {draft.sabores.map(sabor => (
            <li
              key={sabor.localId}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5"
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => abrirEdicao(sabor)}
              >
                <p className="truncate text-sm font-semibold text-primary-text">{sabor.nome}</p>
                {sabor.descricao.trim() ? (
                  <p className="truncate text-[11px] leading-tight text-secondary-text">
                    {sabor.descricao.trim()}
                  </p>
                ) : null}
                <p className="truncate text-xs text-secondary-text">
                  {resumoPrecosPorTamanho(sabor, tamanhosAtivos)}
                </p>
              </button>
              <JiffyIconSwitch
                checked={sabor.ativo}
                onChange={e =>
                  onChange({
                    ...draft,
                    sabores: draft.sabores.map(item =>
                      item.localId === sabor.localId
                        ? { ...item, ativo: e.target.checked }
                        : item
                    ),
                  })
                }
                size="sm"
                inputProps={{ 'aria-label': `Status do sabor ${sabor.nome}` }}
              />
              <button
                type="button"
                className="rounded p-1 text-error hover:bg-error/10"
                aria-label={`Remover sabor ${sabor.nome}`}
                onClick={() => removerSabor(sabor.localId)}
              >
                <MdDeleteOutline size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
})
