'use client'

import { memo, useMemo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import { MdModeEdit, MdAddCircle, MdLink } from 'react-icons/md'

interface GrupoItemProps {
  grupo: GrupoProduto
  index: number
  onStatusChanged?: () => void
  onToggleStatus?: (grupoId: string, novoStatus: boolean) => void
  onEdit?: (grupo: GrupoProduto) => void
  onEditProdutos?: (grupo: GrupoProduto) => void // Abre edição na aba de produtos vinculados
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
  onEditProdutos,
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
  
  // Handler para abrir edição ao clicar na área clicável
  const handleRowClick = useMemo(() => {
    return () => {
      onEdit?.(grupo)
    }
  }, [grupo, onEdit])
  
  // Função para renderizar o ícone do grupo
  const renderIcon = useMemo(() => {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onEdit?.(grupo)
        }}
        className="md:w-[45px] md:h-[45px] w-7 h-7 bg-info rounded-lg border-2 flex items-center justify-center"
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
      className="h-[50px] bg-info rounded-lg md:px-4 px-1 mb-2 flex items-center gap-[10px] hover:bg-[var(--color-primary-background)] transition-colors cursor-default shadow-md  hover:shadow-md"
    >
      {/* Handle de arrastar - apenas esta área é arrastável */}
      <div
        {...attributes}
        {...listeners}
        className="flex-[1] font-nunito font-semibold text-sm text-primary-text flex items-center gap-2 cursor-grab active:cursor-grabbing select-none hover:bg-primary-bg/30 rounded-lg md:px-2 px-1 py-1 transition-colors"
        title="Arraste para reordenar"
      >
        <span className="text-secondary-text md:text-lg text-sm leading-none">☰</span>
        <span>{index + 1}</span>
      </div>

      {/* Ícone - área clicável */}
      <div 
        onClick={handleRowClick}
        className="flex-[2] flex items-center cursor-pointer"
      >
        {renderIcon}
      </div>

      {/* Nome - área clicável */}
      <div 
        onClick={handleRowClick}
        className="flex-[4] font-nunito font-semibold text-xs md:text-sm text-primary-text cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-start gap-2"
      >
        <span>{nome}</span>
        <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onEditProdutos?.(grupo)
          }}
          className="w-5 h-5 rounded-full border border-primary/50 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
          title="Ver produtos vinculados"
        >
          <MdLink />
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
      </div>

      {/* Status - área clicável */}
      <div 
        onClick={handleRowClick}
        className="flex-[2] flex justify-center cursor-pointer"
      >
        <label
          className="relative inline-flex items-center h-4 w-8 md:h-5 md:w-12 cursor-pointer"
          onMouseDown={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          title={isAtivo ? 'Ativo' : 'Desativado'}
        >
          <input
            type="checkbox"
            className="sr-only peer"
            checked={isAtivo}
            onChange={() => onToggleStatus?.(grupo.getId(), !isAtivo)}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="w-full h-full rounded-full bg-gray-300 peer-checked:bg-primary transition-colors" />
          <span className="absolute left-[2px] top-1/2 -translate-y-1/2 h-[12px] w-[12px] md:h-3 md:w-3 rounded-full bg-white shadow peer-checked:translate-x-[12px] md:peer-checked:translate-x-6 transition-transform" />
        </label>
      </div>
    </div>
  )
})

