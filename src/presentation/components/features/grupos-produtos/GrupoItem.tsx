'use client'

import { memo, useMemo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { MdAddCircle, MdLink } from 'react-icons/md'

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

  const bgColor = useMemo(() => {
    return index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
  }, [index])

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`md:h-[50px] py-2 ${bgColor} rounded-lg md:px-4 px-1 mb-2 flex items-center gap-[10px] hover:bg-[var(--color-primary-background)] transition-colors cursor-default hover:shadow-md`}
    >
      {/* Handle de arrastar - apenas esta área é arrastável */}
      <div
        {...attributes}
        {...listeners}
        className="flex-[1] font-nunito font-normal text-sm text-primary-text flex items-center gap-2 cursor-grab active:cursor-grabbing select-none hover:bg-primary-bg/30 active:bg-primary-bg/50 rounded-lg md:px-2 px-2 py-2 min-h-[44px] touch-manipulation"
        title="Arraste para reordenar"
        style={{ touchAction: 'none' }}
      >
        <span className="text-secondary-text md:text-lg text-base leading-none">☰</span>
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
        className="flex-[4] font-nunito font-normal text-xs md:text-sm text-primary-text cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-start gap-2"
      >
        <span>{nome}</span>
        <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onEditProdutos?.(grupo)
          }}
          className="w-7 h-7 rounded-full border border-primary/50 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
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
          className="w-7 h-7 rounded-full border border-primary/50 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
          title="criar um novo produto"
        >
          <MdAddCircle />
        </button>
        </div>
      </div>

      {/* Status: switch padrão; cliques no switch não abrem a edição da linha */}
      <div
        onClick={handleRowClick}
        className="flex-[2] flex cursor-pointer items-end justify-end"
      >
        <div className="flex items-end justify-center"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <JiffyIconSwitch
            checked={isAtivo}
            onChange={(e) => {
              e.stopPropagation()
              onToggleStatus?.(grupo.getId(), e.target.checked)
            }}
            bordered={false}
            size="sm"
            className="shrink-0"
            inputProps={{
              'aria-label': isAtivo ? 'Desativar grupo de produtos' : 'Ativar grupo de produtos',
            }}
          />
        </div>
      </div>
    </div>
  )
})

