'use client'

import { MdDeleteOutline, MdMenuBook } from 'react-icons/md'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import type { Menu } from '@/src/shared/types/menus'

interface MenuListItemProps {
  menu: Menu
  index: number
  onEdit: (menu: Menu) => void
  onOpenCardapio: (menu: Menu) => void
  onToggleStatus: (menu: Menu, ativo: boolean) => void
  onDelete: (menu: Menu) => void
}

export function MenuListItem({
  menu,
  index,
  onEdit,
  onOpenCardapio,
  onToggleStatus,
  onDelete,
}: MenuListItemProps) {
  const bgColor = index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
  const isPrincipal = menu.tipo === 'principal'
  const tipoLabel = isPrincipal ? 'Principal' : 'Personalizado'

  return (
    <div
      className={`mb-2 flex items-center gap-[10px] px-4 py-2 md:h-[50px] ${bgColor} cursor-pointer transition-colors hover:bg-secondary-text/10`}
      onClick={() => onEdit(menu)}
    >
      <div className="flex min-w-0 flex-[4] flex-col items-start justify-center text-left">
        <span className="w-full truncate text-left text-xs font-normal text-primary-text md:text-sm">
          {menu.nome}
        </span>
        {menu.descricao ? (
          <span className="hidden w-full truncate text-left text-xs text-secondary-text md:block">
            {menu.descricao}
          </span>
        ) : null}
      </div>

      <div className="hidden flex-[2] truncate text-xs text-primary-text md:block md:text-sm">
        {tipoLabel}
      </div>

      <div className="hidden flex-[2] truncate text-xs text-secondary-text md:block md:text-sm">
        {menu.codigo}
      </div>

      <div
        className="flex flex-[2] items-center justify-end gap-2"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => onOpenCardapio(menu)}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/50 text-primary transition-colors hover:bg-primary/10"
          title="Abrir cardápio deste menu"
        >
          <MdMenuBook />
        </button>

        {!isPrincipal && (
          <button
            type="button"
            onClick={() => onDelete(menu)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/50 text-primary transition-colors hover:bg-primary/10"
            title="Excluir menu"
          >
            <MdDeleteOutline />
          </button>
        )}

        <JiffyIconSwitch
          checked={menu.ativo}
          onChange={(e) => onToggleStatus(menu, e.target.checked)}
          bordered={false}
          size="sm"
          className="shrink-0"
          inputProps={{
            'aria-label': menu.ativo ? 'Desativar menu' : 'Ativar menu',
          }}
        />
      </div>
    </div>
  )
}
