'use client'

import {
  Button,
  CircularProgress,
  Dialog as MuiDialog,
  DialogActions,
  DialogContent as MuiDialogContent,
  DialogTitle,
  TextField,
} from '@mui/material'
import { MdCancel } from 'react-icons/md'

type Props = {
  open: boolean
  justificativa: string
  isPending: boolean
  onJustificativaChange: (value: string) => void
  onClose: () => void
  onConfirm: () => void
}

export function DetalhesVendaCancelarDialog({
  open,
  justificativa,
  isPending,
  onJustificativaChange,
  onClose,
  onConfirm,
}: Props) {
  return (
    <MuiDialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      sx={{ zIndex: 1400 }}
      PaperProps={{
        sx: {
          borderRadius: '16px',
          maxWidth: '500px',
        },
      }}
    >
      <DialogTitle
        sx={{
          backgroundColor: 'var(--color-error)',
          color: 'white',
          fontFamily: 'var(--font-general-sans), system-ui, sans-serif',
        }}
      >
        Cancelar Venda
      </DialogTitle>
      <MuiDialogContent sx={{ p: 3, backgroundColor: 'var(--color-info)' }}>
        <div className="space-y-4 pt-4">
          <p className="text-secondary-text text-sm">
            Esta ação cancelará a venda e, se houver nota fiscal emitida, também a cancelará na
            SEFAZ.
          </p>
          <p className="text-error text-sm font-semibold">Esta ação não pode ser desfeita!</p>
          <TextField
            label="Justificativa do Cancelamento"
            multiline
            rows={4}
            fullWidth
            value={justificativa}
            onChange={e => onJustificativaChange(e.target.value)}
            placeholder="Digite o motivo do cancelamento (mínimo 15 caracteres)"
            helperText={`${justificativa.length}/15 caracteres mínimos`}
            error={justificativa.length > 0 && justificativa.length < 15}
          />
        </div>
      </MuiDialogContent>
      <DialogActions sx={{ p: 2, backgroundColor: 'var(--color-info)' }}>
        <Button onClick={onClose} variant="outlined" disabled={isPending}>
          Voltar
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="error"
          disabled={isPending || justificativa.trim().length < 15}
          startIcon={isPending ? <CircularProgress size={20} /> : <MdCancel />}
        >
          {isPending ? 'Cancelando...' : 'Confirmar Cancelamento'}
        </Button>
      </DialogActions>
    </MuiDialog>
  )
}
