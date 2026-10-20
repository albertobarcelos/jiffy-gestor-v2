'use client'

import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react'
import {
  MenuCategoriaNesteCardapioCampos,
  type MenuCategoriaNesteCardapioHandle,
} from './MenuCategoriaNesteCardapioCampos'
import type { MenuGrupoProduto } from '@/src/shared/types/menus'

export const MENU_GRUPO_SNAPSHOT_FORM_ID = 'menu-grupo-snapshot-form'

export type MenuGrupoSnapshotHandle = {
  isDirty: () => boolean
  save: () => Promise<boolean>
}

interface MenuGrupoSnapshotFormProps {
  menuId: string
  grupo: MenuGrupoProduto
  produtoId?: string
  onDirtyChange?: (dirty: boolean) => void
  onSavingChange?: (saving: boolean) => void
  onGrupoChange?: (grupo: MenuGrupoProduto) => void
}

export const MenuGrupoSnapshotForm = forwardRef<
  MenuGrupoSnapshotHandle,
  MenuGrupoSnapshotFormProps
>(function MenuGrupoSnapshotForm(
  { menuId, grupo, produtoId, onDirtyChange, onSavingChange, onGrupoChange },
  ref
) {
  const camposRef = useRef<MenuCategoriaNesteCardapioHandle>(null)

  const save = useCallback(async () => (await camposRef.current?.save()) ?? true, [])
  const isDirty = useCallback(() => camposRef.current?.isDirty() ?? false, [])

  useImperativeHandle(ref, () => ({ isDirty, save }), [isDirty, save])

  return (
    <form
      id={MENU_GRUPO_SNAPSHOT_FORM_ID}
      className="min-h-0 flex-1 overflow-y-auto p-2 md:p-4"
      onSubmit={e => {
        e.preventDefault()
        void save()
      }}
    >
      <div className="rounded-[10px] bg-info p-2 md:p-4">
        <div className="mb-2 flex items-center gap-5">
          <h2 className="shrink-0 text-xl font-semibold text-primary">Dados da Categoria</h2>
          <div className="h-px flex-1 bg-primary/70" />
        </div>
        <div className="space-y-4">
          <MenuCategoriaNesteCardapioCampos
            ref={camposRef}
            menuId={menuId}
            grupo={grupo}
            produtoId={produtoId}
            onDirtyChange={onDirtyChange}
            onSavingChange={onSavingChange}
            onGrupoChange={onGrupoChange}
          />
        </div>
      </div>
    </form>
  )
})
