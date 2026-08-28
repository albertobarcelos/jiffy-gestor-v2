'use client'

import { useState } from 'react'
import { FormControl, FormControlLabel, Radio, RadioGroup, TextField } from '@mui/material'
import { IconPickerModal } from '@/src/presentation/components/features/grupos-produtos/IconPickerModal'
import { ColorPickerModal } from '@/src/presentation/components/features/grupos-produtos/ColorPickerModal'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { sxEntradaCompactaProduto } from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'
import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import type { PizzaCategoriaDraft } from './pizzaDefaults'

interface PizzaCategoriaDetalhesTabProps {
  draft: PizzaCategoriaDraft
  onChange: (draft: PizzaCategoriaDraft) => void
}

export function PizzaCategoriaDetalhesTab({ draft, onChange }: PizzaCategoriaDetalhesTabProps) {
  const [iconOpen, setIconOpen] = useState(false)
  const [colorOpen, setColorOpen] = useState(false)

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6">
      <p className="text-xs text-secondary-text">
        Nome, aparência e regra de preço para pizzas meio a meio.
      </p>

      <TextField
        label="Nome da categoria"
        required
        fullWidth
        value={draft.nome}
        onChange={e => onChange({ ...draft, nome: e.target.value.toUpperCase() })}
        sx={sxEntradaCompactaProduto}
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setColorOpen(true)}
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:border-primary/40"
        >
          <span
            className="h-6 w-6 rounded-md border"
            style={{ backgroundColor: draft.corHex }}
            aria-hidden
          />
          Cor
        </button>
        <button
          type="button"
          onClick={() => setIconOpen(true)}
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:border-primary/40"
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-md border"
            style={{ borderColor: draft.corHex }}
          >
            <DinamicIcon iconName={draft.iconName} color={draft.corHex} size={18} />
          </span>
          Ícone
        </button>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-primary-text">Categoria ativa</p>
          <p className="text-xs text-secondary-text">Controla se a categoria aparece no cardápio.</p>
        </div>
        <JiffyIconSwitch
          checked={draft.ativo}
          onChange={e => onChange({ ...draft, ativo: e.target.checked })}
          bordered
        />
      </div>

      <FormControl>
        <p className="mb-2 text-sm font-medium text-primary-text">Regra meio a meio</p>
        <RadioGroup
          value={draft.regraPrecoMultiplosSabores}
          onChange={e =>
            onChange({
              ...draft,
              regraPrecoMultiplosSabores: e.target.value as PizzaCategoriaDraft['regraPrecoMultiplosSabores'],
            })
          }
        >
          <FormControlLabel
            value="proporcional"
            control={<Radio size="small" />}
            label="Proporcional — divide o preço entre os sabores"
          />
          <FormControlLabel
            value="maior"
            control={<Radio size="small" />}
            label="Maior preço — cobra o sabor mais caro"
          />
        </RadioGroup>
      </FormControl>

      <IconPickerModal
        isOpen={iconOpen}
        onClose={() => setIconOpen(false)}
        onSelect={iconName => {
          onChange({ ...draft, iconName })
          setIconOpen(false)
        }}
        selectedColor={draft.corHex}
      />

      <ColorPickerModal
        open={colorOpen}
        onClose={() => setColorOpen(false)}
        onSelect={corHex => {
          onChange({ ...draft, corHex })
          setColorOpen(false)
        }}
      />
    </div>
  )
}
