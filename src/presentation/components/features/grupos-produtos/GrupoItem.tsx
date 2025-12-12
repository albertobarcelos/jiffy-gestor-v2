'use client'

import { memo, useMemo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import { GrupoProdutoActionsMenu } from './GrupoProdutoActionsMenu'
import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import { MdModeEdit, MdAddCircle } from 'react-icons/md'

interface GrupoItemProps {
  grupo: GrupoProduto
  index: number
  onStatusChanged?: () => void
  onToggleStatus?: (grupoId: string, novoStatus: boolean) => void
  onEdit?: (grupo: GrupoProduto) => void
  onCreateProduto?: (grupoId: string) => void
}

/**
 * Item reordenável da lista de grupos (memoizado para evitar re-renders desnecessários)
 */
export const GrupoItem = memo(function GrupoItem({
  grupo,
  index,
  onStatusChanged,
  onToggleStatus,
  onEdit,
  onCreateProduto,
}: GrupoItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: grupo.getId() })

  const style = useMemo(() => ({
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }), [transform, transition, isDragging])

  const corHex = useMemo(() => grupo.getCorHex(), [grupo])
  const iconName = useMemo(() => grupo.getIconName(), [grupo])
  const nome = useMemo(() => grupo.getNome(), [grupo])
  const isAtivo = useMemo(() => grupo.isAtivo(), [grupo])
  // Função para renderizar o ícone do grupo
  const renderIcon = useMemo(() => {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onEdit?.(grupo)
        }}
        className="w-[45px] h-[45px] bg-info rounded-lg border-2 flex items-center justify-center"
        style={{
          borderColor: corHex,
        }}
        title="Editar icone"
      >
        <DinamicIcon iconName={iconName} color={corHex} size={24} />
      </button>
    )
  }, [corHex, iconName, grupo, onEdit])

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="h-[50px] bg-info rounded-lg px-4 mb-2 flex items-center gap-[10px] hover:bg-[var(--color-primary-background)] transition-colors cursor-default shadow-md  hover:shadow-md"
    >
      {/* Handle de arrastar - apenas esta área é arrastável */}
      <div
        {...attributes}
        {...listeners}
        className="flex-[1] font-nunito font-semibold text-sm text-primary-text flex items-center gap-2 cursor-grab active:cursor-grabbing select-none hover:bg-primary-bg/30 rounded-lg px-2 py-1 transition-colors"
        title="Arraste para reordenar"
      >
        <span className="text-secondary-text text-lg leading-none">☰</span>
        <span>{index + 1}</span>
      </div>

      {/* Ícone */}
      <div className="flex-[2] flex items-center cursor-default">{renderIcon}</div>

      {/* Nome */}
      <div className="flex-[4] font-nunito font-semibold text-sm text-primary-text cursor-default flex items-center gap-2">
        {nome}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onEdit?.(grupo)
          }}
          className="w-5 h-5 rounded-full border border-primary/50 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
          title="Editar grupo"
        >
          <MdModeEdit />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onCreateProduto?.(grupo.getId())
          }}
          className="w-5 h-5 rounded-full border border-primary/50 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
          title="criar um novo produto"
        >
          <MdAddCircle />
        </button>
      </div>

      {/* Status */}
      <div className="flex-[2] flex justify-center cursor-default">
        <label
          className="relative inline-flex items-center h-5 w-12 cursor-pointer"
          onMouseDown={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
          title={isAtivo ? 'Ativo' : 'Desativado'}
        >
          <input
            type="checkbox"
            className="sr-only peer"
            checked={isAtivo}
          onChange={() => onToggleStatus?.(grupo.getId(), !isAtivo)}
          />
          <div className="w-full h-full rounded-full bg-gray-300 peer-checked:bg-primary transition-colors" />
          <span className="absolute left-1 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white shadow peer-checked:translate-x-6 transition-transform" />
        </label>
      </div>

      {/* Ações */}
      <div className="flex-[2] flex justify-end cursor-default">
        <GrupoProdutoActionsMenu
          grupoId={grupo.getId()}
          grupoAtivo={isAtivo}
          onStatusChanged={onStatusChanged}
          onEdit={(grupoId) => {
            if (onEdit) {
              onEdit(grupo)
            }
          }}
        />
      </div>
    </div>
  )
})

