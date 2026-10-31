'use client'

import { TextField } from '@mui/material'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MdAdd, MdDeleteOutline, MdDragIndicator } from 'react-icons/md'
import { ProdutoStatusSwitch } from '@/src/presentation/components/features/produtos/ProdutosList/ProdutoStatusSwitch'
import { Button } from '@/src/presentation/components/ui/button'
import { sxEntradaCompactaProduto } from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'
import { cn } from '@/src/shared/utils/cn'
import type { PizzaTamanhoDraft } from './pizzaDefaults'
import { createLocalId, textoPedacos, textoSaboresTamanho } from './pizzaDefaults'
import { PizzaPedacosIcon } from './PizzaPedacosIcon'

const MAX_SABORES_OPCOES = [1, 2, 3, 4] as const
const MAX_SABORES_LIMITE = 4

type TamanhoCardItem = PizzaTamanhoDraft & { id?: string }

interface PizzaTamanhoCardsProps {
  tamanhos: TamanhoCardItem[]
  onChange: (tamanhos: TamanhoCardItem[]) => void
  /** Quando informado, remove card e repassa item (para rastrear id no servidor). */
  onRemover?: (tamanho: TamanhoCardItem) => void
}

function clampMaxSabores(value: number) {
  return Math.min(MAX_SABORES_LIMITE, Math.max(1, value || 1))
}

function PizzaTamanhoSortableCard({
  tamanho,
  podeRemover,
  onAtualizar,
  onRemover,
}: {
  tamanho: TamanhoCardItem
  podeRemover: boolean
  onAtualizar: (localId: string, patch: Partial<PizzaTamanhoDraft>) => void
  onRemover: (tamanho: TamanhoCardItem) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tamanho.localId,
  })
  const maxSabores = clampMaxSabores(tamanho.quantidadeMaximaDivisoes)

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        'flex min-w-[220px] max-w-[240px] shrink-0 flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm',
        tamanho.ativo ? 'border-gray-200' : 'border-gray-100 opacity-70',
        isDragging && 'z-10 border-primary shadow-md'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-1">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="mt-0.5 flex shrink-0 cursor-grab touch-manipulation items-center rounded p-0.5 text-secondary-text hover:bg-gray-100 active:cursor-grabbing"
            title="Arraste para reordenar"
            style={{ touchAction: 'none' }}
            aria-label={`Reordenar tamanho ${tamanho.nome || 'sem nome'}`}
          >
            <MdDragIndicator size={18} />
          </button>
          <PizzaPedacosIcon divisoes={maxSabores} size={40} />
        </div>
        <div className="flex items-center gap-1">
          {podeRemover ? (
            <button
              type="button"
              className="rounded p-1 text-error hover:bg-error/10"
              aria-label="Remover tamanho"
              onClick={() => onRemover(tamanho)}
            >
              <MdDeleteOutline size={18} />
            </button>
          ) : null}
          <ProdutoStatusSwitch
            isAtivo={tamanho.ativo}
            onChange={ativo => onAtualizar(tamanho.localId, { ativo })}
          />
        </div>
      </div>

      <TextField
        size="small"
        fullWidth
        label="Nome"
        value={tamanho.nome}
        onChange={e => onAtualizar(tamanho.localId, { nome: e.target.value.toUpperCase() })}
        sx={sxEntradaCompactaProduto}
      />

      <TextField
        size="small"
        type="number"
        fullWidth
        label="Pedaços"
        inputProps={{ min: 1 }}
        value={tamanho.quantidadePedacos}
        onChange={e =>
          onAtualizar(tamanho.localId, {
            quantidadePedacos: Number.parseInt(e.target.value, 10) || 1,
          })
        }
        sx={sxEntradaCompactaProduto}
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium text-primary-text">Qtd. sabores</span>
        <div
          className="flex items-center gap-2"
          role="group"
          aria-label="Quantidade máxima de sabores"
        >
          {MAX_SABORES_OPCOES.map(opcao => {
            const selected = maxSabores === opcao
            return (
              <button
                key={opcao}
                type="button"
                onClick={() =>
                  onAtualizar(tamanho.localId, {
                    quantidadeMaximaDivisoes: opcao,
                  })
                }
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold leading-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                  'aspect-square p-0',
                  selected
                    ? 'bg-primary text-white'
                    : 'bg-[#D7E0EA] text-primary-text hover:bg-[#C5D0DC]'
                )}
                aria-pressed={selected}
                aria-label={`${opcao} sabor${opcao > 1 ? 'es' : ''}`}
              >
                {opcao}
              </button>
            )
          })}
        </div>
      </div>

      <p className="text-xs text-secondary-text">
        {textoPedacos(tamanho.quantidadePedacos)}
        <br />
        {textoSaboresTamanho(maxSabores)}
      </p>
    </article>
  )
}

export function PizzaTamanhoCards({ tamanhos, onChange, onRemover }: PizzaTamanhoCardsProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const atualizar = (localId: string, patch: Partial<PizzaTamanhoDraft>) => {
    onChange(tamanhos.map(t => (t.localId === localId ? { ...t, ...patch } : t)))
  }

  const adicionar = () => {
    onChange([
      ...tamanhos,
      {
        localId: createLocalId(),
        nome: '',
        quantidadePedacos: 8,
        quantidadeMaximaDivisoes: 2,
        ativo: true,
      },
    ])
  }

  const remover = (tamanho: TamanhoCardItem) => {
    if (tamanhos.length <= 1) return
    if (onRemover) {
      onRemover(tamanho)
      return
    }
    onChange(tamanhos.filter(t => t.localId !== tamanho.localId))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = tamanhos.findIndex(t => t.localId === active.id)
    const newIndex = tamanhos.findIndex(t => t.localId === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    onChange(arrayMove(tamanhos, oldIndex, newIndex))
  }

  const podeRemover = tamanhos.length > 1
  const itemIds = tamanhos.map(t => t.localId)

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div>
        <h2 className="text-sm font-semibold text-primary-text">Tamanhos</h2>
        <p className="mt-1 text-xs text-secondary-text">
          Indique aqui quais os tamanhos que suas pizzas são produzidas, em quantos pedaços são
          cortadas e até quantos sabores seu restaurante monta cada tamanho. Arraste pelo ícone para
          reordenar os cards:
        </p>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={itemIds} strategy={horizontalListSortingStrategy}>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {tamanhos.map(tamanho => (
              <PizzaTamanhoSortableCard
                key={tamanho.localId}
                tamanho={tamanho}
                podeRemover={podeRemover}
                onAtualizar={atualizar}
                onRemover={remover}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button
        type="button"
        variant="outlined"
        className="self-start border-primary text-primary"
        onClick={adicionar}
      >
        <MdAdd className="mr-1" /> Novo tamanho
      </Button>
    </div>
  )
}
