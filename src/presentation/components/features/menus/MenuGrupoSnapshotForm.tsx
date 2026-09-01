'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react'
import { Input } from '@/src/presentation/components/ui/input'
import { sxEntradaCompactaProduto } from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'
import { useMenuMutations } from '@/src/presentation/hooks/menus/useMenuMutations'
import { showToast } from '@/src/shared/utils/toast'
import type { MenuGrupoProduto } from '@/src/shared/types/menus'

export const MENU_GRUPO_SNAPSHOT_FORM_ID = 'menu-grupo-snapshot-form'

export type MenuGrupoSnapshotHandle = {
  isDirty: () => boolean
  save: () => Promise<boolean>
}

interface MenuGrupoSnapshotFormProps {
  menuId: string
  grupo: MenuGrupoProduto
  onDirtyChange?: (dirty: boolean) => void
  onSavingChange?: (saving: boolean) => void
}

export const MenuGrupoSnapshotForm = forwardRef<
  MenuGrupoSnapshotHandle,
  MenuGrupoSnapshotFormProps
>(function MenuGrupoSnapshotForm(
  { menuId, grupo, onDirtyChange, onSavingChange },
  ref
) {
  const { renameGrupo } = useMenuMutations(menuId)
  const [nome, setNome] = useState(grupo.nome)

  useEffect(() => {
    setNome(grupo.nome)
  }, [grupo])

  const isDirty = useCallback(
    () => nome.trim() !== grupo.nome.trim(),
    [nome, grupo.nome]
  )

  useEffect(() => {
    onDirtyChange?.(isDirty())
  }, [isDirty, onDirtyChange])

  const save = useCallback(async () => {
    const nomeTrim = nome.trim()
    if (!nomeTrim) {
      showToast.error('Informe o nome da categoria neste cardápio')
      return false
    }
    onSavingChange?.(true)
    try {
      await renameGrupo.mutateAsync({
        grupoProdutoId: grupo.grupoBase.id,
        nome: nomeTrim,
      })
      showToast.success('Categoria atualizada neste cardápio')
      return true
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Erro ao salvar categoria')
      return false
    } finally {
      onSavingChange?.(false)
    }
  }, [nome, grupo.grupoBase.id, renameGrupo, onSavingChange])

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
          <h2 className="text-xl font-semibold text-primary">Categoria neste cardápio</h2>
          <div className="h-px flex-1 bg-primary/70" />
        </div>
        <p className="mb-4 text-sm text-secondary-text">
          O nome abaixo vale só neste cardápio. O cadastro da categoria não é alterado.
          {grupo.grupoBase.nome ? ` Cadastro: ${grupo.grupoBase.nome}.` : ''}
        </p>
        <Input
          label="Nome no cardápio"
          required
          size="small"
          value={nome}
          onChange={e => setNome(e.target.value)}
          className="bg-white"
          sx={sxEntradaCompactaProduto}
          InputLabelProps={{ required: true }}
        />
      </div>
    </form>
  )
})
