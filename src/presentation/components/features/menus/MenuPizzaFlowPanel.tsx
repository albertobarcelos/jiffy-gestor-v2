'use client'

import { useEffect, useMemo, useState } from 'react'
import { Autocomplete, TextField } from '@mui/material'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { Button } from '@/src/presentation/components/ui/button'
import { MENU_SIDE_PANEL_CLASS } from '@/src/presentation/components/features/menus/menuPanelConstants'
import { sxEntradaCompactaProduto } from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'
import { usePizzaCategorias } from '@/src/presentation/hooks/pizza/usePizza'
import { PizzaCategoriaSetupPanel } from '@/src/presentation/components/features/pizza/PizzaCategoriaSetupPanel'
import { PizzaSaborModal } from '@/src/presentation/components/features/pizza/PizzaSaborModal'
import { VincularPizzaCategoriaMenuPanel } from './VincularPizzaCategoriaMenuPanel'
import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import type { CategoriaPizza } from '@/src/shared/types/pizza'

interface MenuPizzaFlowPanelProps {
  open: boolean
  menuId: string
  menuNome?: string
  initialCategoriaId?: string
  /** Abre direto o fluxo de novo sabor quando a categoria inicial existir. */
  initialAction?: 'sabor'
  onClose: () => void
  onSuccess?: () => void
}

export function MenuPizzaFlowPanel({
  open,
  menuId,
  menuNome,
  initialCategoriaId,
  initialAction,
  onClose,
  onSuccess,
}: MenuPizzaFlowPanelProps) {
  const [setupOpen, setSetupOpen] = useState(false)
  const [vincularOpen, setVincularOpen] = useState(false)
  const [saborPickerOpen, setSaborPickerOpen] = useState(false)
  const [saborModalOpen, setSaborModalOpen] = useState(false)
  const [categoriaSabor, setCategoriaSabor] = useState<CategoriaPizza | null>(null)

  const { data: categoriasData } = usePizzaCategorias({
    ativo: true,
    enabled: open && (saborPickerOpen || Boolean(initialCategoriaId)),
  })
  const categorias = categoriasData?.items ?? []

  const categoriaInicial = useMemo(
    () => categorias.find(c => c.id === initialCategoriaId) ?? null,
    [categorias, initialCategoriaId]
  )

  useEffect(() => {
    if (!open) {
      setSetupOpen(false)
      setVincularOpen(false)
      setSaborPickerOpen(false)
      setSaborModalOpen(false)
      setCategoriaSabor(null)
      return
    }

    if (initialAction === 'sabor' && categoriaInicial) {
      setCategoriaSabor(categoriaInicial)
      setSaborModalOpen(true)
    }
  }, [open, initialAction, categoriaInicial])

  const abrirNovoSabor = () => {
    if (categoriaInicial) {
      setCategoriaSabor(categoriaInicial)
      setSaborModalOpen(true)
      return
    }
    setSaborPickerOpen(true)
  }

  const confirmarCategoriaSabor = () => {
    if (!categoriaSabor) return
    setSaborPickerOpen(false)
    setSaborModalOpen(true)
  }

  return (
    <>
      <JiffySidePanelModal
        open={open && !setupOpen && !vincularOpen && !saborPickerOpen && !saborModalOpen}
        onClose={onClose}
        title="Pizza no cardápio"
        subtitle={menuNome ? `Cardápio: ${menuNome}` : undefined}
        panelClassName={MENU_SIDE_PANEL_CLASS}
        footerVariant="bar"
        footerActions={{
          showCancel: true,
          cancelLabel: 'Fechar',
          onCancel: onClose,
          barSecondaryTone: 'primary',
        }}
      >
        <div className="flex flex-col gap-3 p-4 md:p-6">
          <p className="text-sm text-secondary-text">
            Configure pizzas neste cardápio. Sabores ativos são vinculados automaticamente ao
            salvar.
          </p>
          <Button variant="contained" onClick={() => setSetupOpen(true)}>
            + Nova categoria pizza
          </Button>
          <Button variant="outlined" onClick={abrirNovoSabor}>
            + Adicionar sabor
          </Button>
          <Button variant="outlined" onClick={() => setVincularOpen(true)}>
            Vincular categoria existente
          </Button>
        </div>
      </JiffySidePanelModal>

      <PizzaCategoriaSetupPanel
        open={setupOpen}
        menuId={menuId}
        onClose={() => setSetupOpen(false)}
        onSuccess={() => {
          onSuccess?.()
          setSetupOpen(false)
        }}
      />

      <VincularPizzaCategoriaMenuPanel
        open={vincularOpen}
        menuId={menuId}
        onClose={() => setVincularOpen(false)}
        onSuccess={() => {
          onSuccess?.()
          setVincularOpen(false)
        }}
      />

      <JiffySidePanelModal
        open={saborPickerOpen}
        onClose={() => setSaborPickerOpen(false)}
        title="Escolher categoria"
        subtitle="Selecione a categoria do novo sabor."
        panelClassName={MENU_SIDE_PANEL_CLASS}
        footerVariant="bar"
        footerActions={{
          showCancel: true,
          cancelLabel: 'Voltar',
          onCancel: () => setSaborPickerOpen(false),
          showSave: true,
          saveLabel: 'Continuar',
          saveDisabled: !categoriaSabor,
          onSave: confirmarCategoriaSabor,
          barSecondaryTone: 'primary',
          barActionOrder: ['cancel', 'save'],
        }}
      >
        <div className="p-4 md:p-6">
          <Autocomplete<CategoriaPizza, false, false, false>
            options={categorias}
            value={categoriaSabor}
            onChange={(_, value) => setCategoriaSabor(value)}
            getOptionLabel={option => option.nome}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                <span className="flex items-center gap-2">
                  <DinamicIcon iconName={option.iconName} color={option.corHex} size={16} />
                  {option.nome}
                </span>
              </li>
            )}
            renderInput={params => (
              <TextField {...params} label="Categoria pizza" required sx={sxEntradaCompactaProduto} />
            )}
          />
        </div>
      </JiffySidePanelModal>

      <PizzaSaborModal
        open={saborModalOpen}
        categoria={categoriaSabor}
        menuId={menuId}
        onClose={() => {
          setSaborModalOpen(false)
          setCategoriaSabor(null)
        }}
        onSuccess={() => {
          onSuccess?.()
          setSaborModalOpen(false)
          setCategoriaSabor(null)
        }}
      />
    </>
  )
}
