'use client'

import { Dialog, DialogContent } from '@/src/presentation/components/ui/dialog'
import { DateTimeRangePicker } from '@/src/presentation/components/ui/DateTimeRangePicker'

interface EscolheDatasModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (dataInicial: Date | null, dataFinal: Date | null) => void
  dataInicial?: Date | null
  dataFinal?: Date | null
  usePopover?: boolean // Se true, renderiza apenas o conteúdo sem Dialog
}

/**
 * Modal para seleção de período por datas
 * Permite escolher uma data inicial e uma data final para filtrar vendas
 */
export function EscolheDatasModal({
  open,
  onClose,
  onConfirm,
  dataInicial: initialDataInicial,
  dataFinal: initialDataFinal,
  usePopover = false,
}: EscolheDatasModalProps) {
  const picker = (
    <DateTimeRangePicker
      open={open}
      value={{ dataInicial: initialDataInicial ?? null, dataFinal: initialDataFinal ?? null }}
      onClose={onClose}
      onConfirm={({ dataInicial, dataFinal }) => onConfirm(dataInicial, dataFinal)}
      title="Escolha as Datas"
      confirmText="Filtrar"
    />
  )

  // Se usar Popover, retorna apenas o conteúdo
  if (usePopover) {
    return picker
  }

  // Caso contrário, usa Dialog (comportamento padrão)
  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose()
        }
      }}
      fullWidth
      maxWidth="sm"
      sx={{
        '& .MuiDialog-container': {
          justifyContent: 'flex-end',
          alignItems: 'flex-start',
          paddingTop: '80px',
          paddingRight: '20px',
        },
      }}
      PaperProps={{
        sx: {
          borderRadius: '12px',
          maxWidth: '400px',
          margin: 0,
        },
      }}
    >
      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
        {picker}
      </DialogContent>
    </Dialog>
  )
}
