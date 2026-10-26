'use client'

import { useMemo, useState } from 'react'
import { MdAdd, MdDeleteOutline } from 'react-icons/md'
import { Button } from '@/src/presentation/components/ui/button'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { formatPizzaMoney, type PizzaCategoriaDraft, type PizzaSaborDraft } from './pizzaDefaults'
import { PizzaSaborDraftModal } from './PizzaSaborDraftModal'

interface PizzaCategoriaSaboresStepProps {
  draft: PizzaCategoriaDraft
  onChange: (draft: PizzaCategoriaDraft) => void
}

function resumoPrecos(sabor: PizzaSaborDraft) {
  const valores = Object.values(sabor.precosPorTamanhoLocalId)
    .filter(cfg => cfg.enabled && cfg.valor > 0)
    .map(cfg => cfg.valor)
  if (valores.length === 0) return 'Sem preço'
  const min = Math.min(...valores)
  const max = Math.max(...valores)
  if (min === max) return formatPizzaMoney(min)
  return `A partir de ${formatPizzaMoney(min)}`
}

export function PizzaCategoriaSaboresStep({ draft, onChange }: PizzaCategoriaSaboresStepProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PizzaSaborDraft | null>(null)

  const tamanhosAtivos = useMemo(
    () => draft.tamanhos.filter(t => t.nome.trim() && t.ativo),
    [draft.tamanhos]
  )

  const abrirNovo = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const abrirEdicao = (sabor: PizzaSaborDraft) => {
    setEditing(sabor)
    setModalOpen(true)
  }

  const handleSaveSabor = (sabor: PizzaSaborDraft) => {
    const exists = draft.sabores.some(item => item.localId === sabor.localId)
    onChange({
      ...draft,
      sabores: exists
        ? draft.sabores.map(item => (item.localId === sabor.localId ? sabor : item))
        : [...draft.sabores, sabor],
    })
  }

  const removerSabor = (localId: string) => {
    onChange({
      ...draft,
      sabores: draft.sabores.filter(item => item.localId !== localId),
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
      <div>
        <h2 className="text-base font-semibold text-primary-text">Sabores</h2>
        <p className="mt-1 text-sm text-secondary-text">
          Cadastre os sabores e os preços por tamanho. Tudo será salvo junto com a categoria no
          final.
        </p>
      </div>

      {tamanhosAtivos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-secondary-text">
          Configure ao menos um tamanho ativo no passo anterior para cadastrar sabores com preço.
        </p>
      ) : null}

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
                <p className="text-xs text-secondary-text">{resumoPrecos(sabor)}</p>
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

      <Button
        type="button"
        variant="outlined"
        className="self-start border-primary text-primary"
        onClick={abrirNovo}
        disabled={tamanhosAtivos.length === 0}
      >
        <MdAdd className="mr-1" /> Novo sabor
      </Button>

      <PizzaSaborDraftModal
        open={modalOpen}
        categoriaNome={draft.nome.trim() || 'Nova categoria pizza'}
        tamanhos={draft.tamanhos}
        initial={editing}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        onSave={handleSaveSabor}
      />
    </div>
  )
}
