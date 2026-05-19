/**
 * Estilos compartilhados para TextField/Input outlined (label na borda).
 * Usado pelo componente Input e reutilizável em formulários com `sx={...}`.
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

/** Borda do outlined — necessário porque o preflight do Tailwind zera border-width em `*`. */
export const sxOutlinedInputBorda = {
  '& .MuiOutlinedInput-notchedOutline': {
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'rgba(0, 0, 0, 0.23)',
  },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
    borderWidth: '1px',
    borderColor: 'rgba(0, 0, 0, 0.23)',
  },
  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderWidth: '1px',
    borderColor: 'var(--color-primary)',
  },
  '& .MuiOutlinedInput-root.Mui-error .MuiOutlinedInput-notchedOutline': {
    borderWidth: '1px',
  },
} as const

export const sxCampoOutlinedPadrao = {
  ...sxOutlinedLabelTextoEscuro,
  ...sxOutlinedInputBorda,
  '& .MuiOutlinedInput-root': {
    borderRadius: '8px',
    backgroundColor: '#fff',
  },
} as const
