'use client'

import { memo, useMemo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import { GrupoProdutoActionsMenu } from './GrupoProdutoActionsMenu'
import { DinamicIcon } from '@/src/shared/utils/iconRenderer'

interface GrupoItemProps {
  grupo: GrupoProduto
  index: number
  onStatusChanged?: () => void
}

/**
 * Item reordenável da lista de grupos (memoizado para evitar re-renders desnecessários)
 */
export const GrupoItem = memo(function GrupoItem({ grupo, index, onStatusChanged }: GrupoItemProps) {
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
  const statusClass = useMemo(
    () =>
      isAtivo
        ? 'bg-success/20 text-success'
        : 'bg-error/20 text-secondary-text',
    [isAtivo]
  )

  // Função para renderizar o ícone do grupo
  const renderIcon = useMemo(() => {
    return (
      <div
        className="w-[45px] h-[45px] rounded-lg border-2 flex items-center justify-center"
        style={{
          backgroundColor: '#FFFFFF',
          borderColor: corHex,
        }}
      >
        <DinamicIcon
          iconName={iconName}
          color={corHex}
          size={24}
        />
      </div>
    )
  }, [corHex, iconName])

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="h-[50px] bg-info rounded-xl px-4 mb-2 flex items-center gap-[10px]"
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
      <div className="flex-[4] font-nunito font-semibold text-sm text-primary-text cursor-default">
        {nome}
      </div>

      {/* Status */}
      <div className="flex-[2] flex justify-center cursor-default">
        <div
          className={`w-20 px-3 py-1 rounded-[24px] text-center text-sm font-nunito font-medium ${statusClass}`}
        >
          {isAtivo ? 'Ativo' : 'Desativado'}
        </div>
      </div>

      {/* Ações */}
      <div className="flex-[2] flex justify-end cursor-default">
        <GrupoProdutoActionsMenu
          grupoId={grupo.getId()}
          grupoAtivo={isAtivo}
          onStatusChanged={onStatusChanged}
        />
      </div>
    </div>
  )
})

