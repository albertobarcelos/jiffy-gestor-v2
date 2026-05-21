'use client'

import { useEffect, useState } from 'react'
import { Box, Drawer } from '@mui/material'
import { Checkbox } from '@/src/presentation/components/ui/checkbox'
import { Button } from '@/src/presentation/components/ui/button'
import {
  MVP_COLUNA_CATALOGO,
  MVP_LAYOUT_DEFAULT,
  cloneLayout,
  ordenarColunasPorCatalogo,
  toggleColunaLista,
  type MvpPersonalizacaoLayout,
} from '../mvpPersonalizacao'

const sxBotaoAplicar = {
  bgcolor: 'var(--color-primary)',
  color: '#fff',
  '&:hover': {
    bgcolor: 'var(--color-primary)',
    opacity: 0.92,
  },
}

const sxBotaoOutlinedPrimary = {
  borderColor: 'var(--color-primary)',
  color: 'var(--color-primary)',
  '&:hover': {
    borderColor: 'var(--color-primary)',
    bgcolor: 'rgba(0, 51, 102, 0.08)',
  },
}

const sxBotaoTextPrimary = {
  color: 'var(--color-primary)',
  '&:hover': {
    bgcolor: 'rgba(0, 51, 102, 0.08)',
  },
}

const sxCheckboxPrimary = {
  color: 'var(--color-primary)',
  '&.Mui-checked': {
    color: 'var(--color-primary)',
  },
  '&.MuiCheckbox-indeterminate': {
    color: 'var(--color-primary)',
  },
}

export function MvpPersonalizarDrawer(props: {
  open: boolean
  onClose: () => void
  layout: MvpPersonalizacaoLayout
  onAplicar: (layout: MvpPersonalizacaoLayout) => void
}) {
  const { open, onClose, layout, onAplicar } = props
  const [draft, setDraft] = useState<MvpPersonalizacaoLayout>(() => cloneLayout(layout))

  useEffect(() => {
    if (open) setDraft(cloneLayout(layout))
  }, [open, layout])

  const handleAplicar = () => {
    onAplicar({
      ...draft,
      colunas: ordenarColunasPorCatalogo(draft.colunas),
    })
    onClose()
  }

  const handleRestaurar = () => {
    setDraft(cloneLayout(MVP_LAYOUT_DEFAULT))
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 400 }, maxWidth: '100vw' },
      }}
    >
      <Box className="font-nunito flex h-full flex-col bg-info p-4">
        <h2 className="text-lg font-semibold text-primary-text">Personalizar relatório</h2>
        <p className="mt-1 text-xs text-secondary-text">
          Escolha as colunas da tabela para exibição no relatório. 
          As preferências são salvas neste navegador.
        </p>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
          <ul className="flex flex-col gap-2">
            {MVP_COLUNA_CATALOGO.map(col => {
              const locked = col.id === 'produto'
              const checked = draft.colunas.includes(col.id)
              return (
                <li
                  key={col.id}
                  className="flex items-start gap-2 rounded-lg border border-primary/10 bg-white px-2 py-1.5"
                  title={col.hint}
                >
                  <Checkbox
                    size="small"
                    color="primary"
                    checked={checked}
                    disabled={locked}
                    sx={sxCheckboxPrimary}
                    onChange={() =>
                      setDraft(prev => ({
                        ...prev,
                        colunas: toggleColunaLista(prev.colunas, col.id),
                      }))
                    }
                  />
                  <span className="text-sm text-primary-text">
                    {col.label}
                    {locked ? (
                      <span className="ml-1 text-xs text-secondary-text">(obrigatório)</span>
                    ) : null}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="mt-4 flex flex-col gap-2 border-t border-primary/10 pt-4">
          <Button variant="contained" color="primary" fullWidth sx={sxBotaoAplicar} onClick={handleAplicar}>
            Aplicar
          </Button>
          <Button
            variant="outlined"
            color="primary"
            fullWidth
            sx={sxBotaoOutlinedPrimary}
            onClick={handleRestaurar}
          >
            Restaurar padrão
          </Button>
          <Button variant="text" color="primary" fullWidth sx={sxBotaoTextPrimary} onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </Box>
    </Drawer>
  )
}
