/**
 * Estilos MUI alinhados a NovoComplemento / NovoGrupo: label na borda (outlined), texto escuro.
 */
export const sxOutlinedLabelTextoEscuro = {
  '& .MuiInputLabel-root': {
    color: 'var(--color-primary-text)',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: 'var(--color-primary-text)',
  },
  '& .MuiInputLabel-root.MuiInputLabel-shrink': {
    color: 'var(--color-primary-text)',
  },
  '& .MuiFormLabel-asterisk': {
    color: 'var(--color-error)',
  },
} as const

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
  '& .MuiOutlinedInput-input': entradaCompactaInput,
} as const

/** FormControl + Select */
export const sxEntradaCompactaProdutoSelect = {
  ...sxOutlinedLabelTextoEscuro,
  '& .MuiOutlinedInput-input': entradaCompactaInput,
  '& .MuiSelect-select': entradaCompactaSelect,
  '& .MuiOutlinedInput-root': {
    backgroundColor: '#fff',
  },
} as const
