import {
  sxOutlinedInputBorda,
  sxOutlinedLabelTextoEscuro,
} from '@/src/shared/theme/muiOutlinedFieldSx'

export { sxOutlinedLabelTextoEscuro }

const entradaCompactaInput = {
  padding: '10px',
  fontSize: '0.875rem',
} as const

const entradaCompactaSelect = {
  padding: '10px',
  fontSize: '0.875rem',
  minHeight: '1.5em',
  lineHeight: 1.4,
  display: 'block',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const

/** TextField / Input outlined */
export const sxEntradaCompactaProduto = {
  ...sxOutlinedLabelTextoEscuro,
  ...sxOutlinedInputBorda,
  '& .MuiOutlinedInput-input': entradaCompactaInput,
} as const

/** FormControl + Select */
export const sxEntradaCompactaProdutoSelect = {
  ...sxOutlinedLabelTextoEscuro,
  ...sxOutlinedInputBorda,
  '& .MuiOutlinedInput-input': entradaCompactaInput,
  '& .MuiSelect-select': entradaCompactaSelect,
  '& .MuiOutlinedInput-root': {
    backgroundColor: '#fff',
  },
} as const
