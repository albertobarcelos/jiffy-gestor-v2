'use client'

import { FormControl, InputLabel, MenuItem, Select } from '@mui/material'
import {
  MVP_CHART_TIPO_OPCOES,
  type MvpChartTipo,
} from '../mvpChartTipos'

type OpcaoChartTipo = { value: MvpChartTipo; label: string }
import { sxRelatorioFiltroSelectBase } from '../mvpFiltrosVendasSx'

export function MvpChartTipoSelect(props: {
  value: MvpChartTipo
  onChange: (next: MvpChartTipo) => void
  idPrefix: string
  opcoes?: readonly OpcaoChartTipo[]
}) {
  const { value, onChange, idPrefix, opcoes = MVP_CHART_TIPO_OPCOES } = props
  const labelId = `${idPrefix}-chart-tipo-label`

  return (
    <FormControl size="small" variant="outlined" sx={{ ...sxRelatorioFiltroSelectBase, minWidth: 130 }}>
      <InputLabel id={labelId} shrink>
        Tipo de gráfico
      </InputLabel>
      <Select
        labelId={labelId}
        label="Tipo de gráfico"
        value={value}
        onChange={e => onChange(e.target.value as MvpChartTipo)}
        className="font-nunito"
      >
        {opcoes.map(op => (
          <MenuItem key={op.value} value={op.value}>
            {op.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
