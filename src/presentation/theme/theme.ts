import { createTheme } from '@mui/material/styles'

/**
 * Tema customizado do Material UI
 * Baseado nas cores do projeto Jiffy Gestor
 */
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#171A1C', // Cor primária do projeto
      light: '#2C2F31',
      dark: '#0D0F11',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#E5E5E5', // Cor secundária
      light: '#F5F5F5',
      dark: '#D5D5D5',
      contrastText: '#171A1C',
    },
    error: {
      main: '#EF4444', // Vermelho para erros
      light: '#F87171',
      dark: '#DC2626',
    },
    warning: {
      main: '#F59E0B', // Amarelo para avisos
      light: '#FBBF24',
      dark: '#D97706',
    },
    info: {
      main: '#F8F9FA', // Cinza claro para backgrounds
      light: '#FFFFFF',
      dark: '#E9ECEF',
    },
    success: {
      main: '#10B981', // Verde para sucesso
      light: '#34D399',
      dark: '#059669',
    },
    background: {
      default: '#F8F9FA',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#171A1C',
      secondary: '#6B7280',
    },
  },
  typography: {
    fontFamily: [
      'Nunito',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontFamily: 'Exo, sans-serif',
      fontWeight: 700,
    },
    h2: {
      fontFamily: 'Exo, sans-serif',
      fontWeight: 700,
    },
    h3: {
      fontFamily: 'Exo, sans-serif',
      fontWeight: 600,
    },
    h4: {
      fontFamily: 'Exo, sans-serif',
      fontWeight: 600,
    },
    h5: {
      fontFamily: 'Exo, sans-serif',
      fontWeight: 600,
    },
    h6: {
      fontFamily: 'Exo, sans-serif',
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          fontWeight: 600,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
  },
})

