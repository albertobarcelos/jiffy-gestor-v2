'use client'

import { memo, useMemo, useRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { MdAddCircle, MdLink, MdPhotoCamera } from 'react-icons/md'
import { DELIVERY_IMAGE_ACCEPT } from '@/src/shared/constants/deliveryImageUpload'

export type GrupoProdutoVisualMode = 'icones' | 'imagens'

interface GrupoItemProps {
  grupo: GrupoProduto
  index: number
  visualMode?: GrupoProdutoVisualMode
  imagemUrl?: string | null
  isUploadingImagem?: boolean
  onUploadImagem?: (grupoId: string, file: File) => void
  onStatusChanged?: () => void
  onToggleStatus?: (grupoId: string, novoStatus: boolean) => void
  onToggleAtivoDelivery?: (grupoId: string, ativoDelivery: boolean) => void
  onEdit?: (grupo: GrupoProduto) => void
  onEditProdutos?: (grupo: GrupoProduto) => void // Abre edição na aba de produtos vinculados
  onCreateProduto?: (grupoId: string) => void
}

function GrupoImagemThumb({
  nome,
  imagemUrl,
  isUploading,
  onSelectFile,
}: {
  nome: string
  imagemUrl?: string | null
  isUploading?: boolean
  onSelectFile: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const hasImage = Boolean(imagemUrl)
  const label = hasImage ? `Trocar imagem de ${nome}` : `Inserir imagem de ${nome}`

  return (
    <button
      type="button"
      onClick={e => {
        e.stopPropagation()
        if (isUploading) return
        inputRef.current?.click()
      }}
      disabled={isUploading}
      aria-label={label}
      title={label}
      className="relative h-7 w-7 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60 md:h-[45px] md:w-[45px]"
    >
      <input
        ref={inputRef}
        type="file"
        accept={DELIVERY_IMAGE_ACCEPT}
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) onSelectFile(file)
        }}
      />
      {imagemUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imagemUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <MdPhotoCamera className="h-4 w-4 text-secondary-text/70 md:h-5 md:w-5" />
        </div>
      )}
      {isUploading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/35">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </div>
      ) : null}
    </button>
  )
}

/**
 * Item reordenável da lista de grupos (memoizado para evitar re-renders desnecessários)
 */
export const GrupoItem = memo(function GrupoItem({
  grupo,
  index,
  visualMode = 'icones',
  imagemUrl = null,
  isUploadingImagem,
  onUploadImagem,
  onStatusChanged,
  onToggleStatus,
  onToggleAtivoDelivery,
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
  const isAtivoDelivery = useMemo(() => grupo.isAtivoDelivery(), [grupo])
  
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

      {/* Ícone ou imagem - área clicável */}
      <div 
        onClick={visualMode === 'icones' ? handleRowClick : undefined}
        className="flex-[2] flex items-center cursor-pointer"
      >
        {visualMode === 'imagens' ? (
          <GrupoImagemThumb
            nome={nome}
            imagemUrl={imagemUrl}
            isUploading={isUploadingImagem}
            onSelectFile={file => onUploadImagem?.(grupo.getId(), file)}
          />
        ) : (
          renderIcon
        )}
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

      {/* Delivery: switch ativo delivery */}
      <div
        onClick={handleRowClick}
        className="flex-[2] flex cursor-pointer items-end justify-end"
      >
        <div
          className="flex items-end justify-center"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <JiffyIconSwitch
            checked={isAtivoDelivery}
            onChange={(e) => {
              e.stopPropagation()
              onToggleAtivoDelivery?.(grupo.getId(), e.target.checked)
            }}
            bordered={false}
            size="sm"
            className="shrink-0"
            inputProps={{
              'aria-label': isAtivoDelivery
                ? 'Desativar grupo no delivery'
                : 'Ativar grupo no delivery',
            }}
          />
        </div>
      </div>

      {/* Status: switch padrão; cliques no switch não abrem a edição da linha */}
      <div
        onClick={handleRowClick}
        className="flex-[2] flex cursor-pointer items-end justify-end"
      >
        <div
          className="flex items-end justify-center"
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
