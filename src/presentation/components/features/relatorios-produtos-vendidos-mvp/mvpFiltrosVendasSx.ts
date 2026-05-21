import { sxEntradaCompactaProdutoSelect } from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'

/** Alinhado a `VendasList.tsx` — borda outlined sempre visível. */
export const sxVendasFiltroOutlinedInputRoot = {
  backgroundColor: '#fff',
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(0, 0, 0, 0.23)',
    borderWidth: 1,
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(0, 0, 0, 0.23)',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderWidth: 1,
    borderColor: 'var(--color-primary)',
  },
} as const

export const sxRelatorioFiltroSelectBase = {
  ...sxEntradaCompactaProdutoSelect,
  minWidth: 160,
  '& .MuiOutlinedInput-root': {
    ...sxVendasFiltroOutlinedInputRoot,
    height: 35,
    minHeight: 35,
    padding: '4px 2px 4px 0',
  },
  '& .MuiInputLabel-root': {
    color: 'var(--color-secondary-text)',
    fontWeight: 300,
    fontSize: '0.975rem',
    fontFamily: '"Nunito", sans-serif',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: 'var(--color-secondary-text)',
    fontWeight: 300,
  },
  '& .MuiInputLabel-root.MuiInputLabel-shrink': {
    color: 'var(--color-secondary-text)',
    fontWeight: 300,
  },
} as const

export const sxRelatorioFiltroSelectPeriodo = {
  minWidth: 150,
  '& .MuiOutlinedInput-root': {
    height: '32px',
    backgroundColor: 'var(--color-primary)',
    color: 'white',
    fontSize: '13px',
    fontFamily: '"Nunito", sans-serif',
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: 'var(--color-primary)',
    },
    '& .MuiSvgIcon-root': {
      color: 'white',
    },
  },
} as const

export const sxRelatorioFiltroTextFieldMoeda = {
  width: '8.5rem',
  marginTop: 0,
  marginBottom: 0,
  '& .MuiOutlinedInput-root': {
    ...sxVendasFiltroOutlinedInputRoot,
    backgroundColor: 'var(--color-info)',
    fontFamily: '"Nunito", sans-serif',
    height: 30,
    minHeight: 30,
    paddingLeft: 2,
    paddingRight: 2,
    alignItems: 'center',
    boxSizing: 'border-box',
  },
  '& .MuiInputLabel-root': {
    color: 'var(--color-secondary-text)',
    fontWeight: 300,
    fontSize: '0.975rem',
    fontFamily: '"Nunito", sans-serif',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: 'var(--color-secondary-text)',
    fontWeight: 300,
  },
  '& .MuiInputLabel-root.MuiInputLabel-shrink': {
    color: 'var(--color-secondary-text)',
    fontWeight: 300,
  },
  '& .MuiInputBase-input': {
    fontSize: '0.875rem',
    lineHeight: 1,
    padding: '4px 2px 4px 0',
    height: 30,
    minHeight: 30,
  },
  '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
    WebkitAppearance: 'none',
    margin: 0,
  },
  '& input[type=number]': {
    MozAppearance: 'textfield',
  },
} as const

export const sxRelatorioFiltroTextFieldNumero = {
  width: '6.5rem',
  marginTop: 0,
  marginBottom: 0,
  '& .MuiOutlinedInput-root': {
    ...sxVendasFiltroOutlinedInputRoot,
    backgroundColor: 'var(--color-info)',
    fontFamily: '"Nunito", sans-serif',
    height: 30,
    minHeight: 30,
  },
  '& .MuiInputLabel-root': {
    color: 'var(--color-secondary-text)',
    fontWeight: 300,
    fontSize: '0.875rem',
    fontFamily: '"Nunito", sans-serif',
  },
  '& .MuiInputBase-input': {
    fontSize: '0.875rem',
    padding: '4px 6px',
  },
} as const

export const menuPropsRelatorioFiltroListaLonga = {
  PaperProps: {
    sx: {
      maxHeight: '400px',
    },
  },
} as const
