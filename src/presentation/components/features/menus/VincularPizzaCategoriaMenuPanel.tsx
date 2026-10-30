'use client'

import { useMemo } from 'react'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { Button } from '@/src/presentation/components/ui/button'
import { MENU_SIDE_PANEL_CLASS } from '@/src/presentation/components/features/menus/menuPanelConstants'
import { usePizzaCategorias } from '@/src/presentation/hooks/pizza/usePizza'
import { useVincularPizzaCategoriaAoMenuMutation } from '@/src/presentation/hooks/pizza/useVincularPizzaCategoriaMenus'
import { showToast } from '@/src/shared/utils/toast'
import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import type { CategoriaPizza } from '@/src/shared/types/pizza'

interface VincularPizzaCategoriaMenuPanelProps {
  open: boolean
  menuId: string
  onClose: () => void
  onSuccess?: () => void
}

export function VincularPizzaCategoriaMenuPanel({
  open,
  menuId,
  onClose,
  onSuccess,
}: VincularPizzaCategoriaMenuPanelProps) {
  const { data, isLoading, refetch } = usePizzaCategorias({ ativo: true, enabled: open })
  const categorias = data?.items ?? []
  const vincularMutation = useVincularPizzaCategoriaAoMenuMutation()
  const savingId = vincularMutation.isPending
    ? (vincularMutation.variables?.categoriaPizzaId ?? null)
    : null

  const categoriasOrdenadas = useMemo(
    () => [...categorias].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [categorias]
  )

  const handleVincular = async (categoria: CategoriaPizza) => {
    try {
      await vincularMutation.mutateAsync({
        menuId,
        categoriaPizzaId: categoria.id,
      })
      showToast.success(`"${categoria.nome}" vinculada ao cardápio`)
      onSuccess?.()
      onClose()
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro ao vincular categoria')
    }
  }

  return (
    <JiffySidePanelModal
      open={open}
      onClose={onClose}
      title="Vincular categoria pizza"
      subtitle="Escolha uma categoria existente para incluir no cardápio."
      panelClassName={MENU_SIDE_PANEL_CLASS}
      footerVariant="bar"
      footerActions={{
        showCancel: true,
        cancelLabel: 'Fechar',
        onCancel: onClose,
        barSecondaryTone: 'primary',
      }}
    >
      <div className="flex flex-col gap-3 p-4">
        {isLoading ? (
          <JiffyLoading text="Carregando categorias..." />
        ) : categoriasOrdenadas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center">
            <p className="text-sm text-secondary-text">
              Nenhuma categoria pizza cadastrada. Crie uma categoria antes de vincular.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
            {categoriasOrdenadas.map(categoria => (
              <li
                key={categoria.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
                    style={{ borderColor: categoria.corHex }}
                  >
                    <DinamicIcon
                      iconName={categoria.iconName}
                      color={categoria.corHex}
                      size={18}
                    />
                  </span>
                  <p className="truncate text-sm font-medium text-primary-text">{categoria.nome}</p>
                </div>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={savingId === categoria.id}
                  onClick={() => void handleVincular(categoria)}
                >
                  {savingId === categoria.id ? 'Vinculando…' : 'Vincular'}
                </Button>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          className="self-start text-xs font-medium text-primary hover:underline"
          onClick={() => void refetch()}
        >
          Atualizar lista
        </button>
      </div>
    </JiffySidePanelModal>
  )
}
