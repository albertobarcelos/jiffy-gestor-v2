'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent } from '@/src/presentation/components/ui/dialog'
import { MdClose, MdCalendarToday, MdAccessTime } from 'react-icons/md'

interface EscolheDatasModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (dataInicial: Date | null, dataFinal: Date | null) => void
  dataInicial?: Date | null
  dataFinal?: Date | null
}

/**
 * Formata Date para string no formato YYYY-MM-DD (formato do input date)
 */
const formatDateForInput = (date: Date | null | undefined): string => {
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Formata Date para string no formato HH:mm (formato do input time)
 */
const formatTimeForInput = (date: Date | null | undefined): string => {
  if (!date) return ''
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * Converte string YYYY-MM-DD para Date
 * Usa componentes locais para evitar problemas de timezone
 */
const parseDateFromInput = (dateString: string): Date | null => {
  if (!dateString) return null
  
  // Extrai ano, mês e dia da string YYYY-MM-DD
  const [year, month, day] = dateString.split('-').map(Number)
  
  // Cria a data usando componentes locais (não UTC)
  // month - 1 porque Date usa índice 0-11 para meses
  const date = new Date(year, month - 1, day, 0, 0, 0, 0)
  
  return date
}

/**
 * Converte string HH:mm para objeto com horas e minutos
 */
const parseTimeFromInput = (timeString: string): { hours: number; minutes: number } | null => {
  if (!timeString) return null
  
  const [hours, minutes] = timeString.split(':').map(Number)
  return { hours, minutes }
}

/**
 * Combina data e hora em um objeto Date
 */
const combineDateAndTime = (date: Date | null, time: { hours: number; minutes: number } | null): Date | null => {
  if (!date) return null
  
  const combined = new Date(date)
  if (time) {
    combined.setHours(time.hours, time.minutes, 0, 0)
  }
  return combined
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
}: EscolheDatasModalProps) {
  const [dataInicialStr, setDataInicialStr] = useState<string>(
    formatDateForInput(initialDataInicial)
  )
  const [horaInicialStr, setHoraInicialStr] = useState<string>(
    formatTimeForInput(initialDataInicial)
  )
  const [dataFinalStr, setDataFinalStr] = useState<string>(formatDateForInput(initialDataFinal))
  const [horaFinalStr, setHoraFinalStr] = useState<string>(
    formatTimeForInput(initialDataFinal)
  )

  // Atualiza os valores quando as props mudam
  useEffect(() => {
    setDataInicialStr(formatDateForInput(initialDataInicial))
    setHoraInicialStr(formatTimeForInput(initialDataInicial))
    setDataFinalStr(formatDateForInput(initialDataFinal))
    setHoraFinalStr(formatTimeForInput(initialDataFinal))
  }, [initialDataInicial, initialDataFinal, open])

  const handleConfirm = () => {
    const dataInicialDate = parseDateFromInput(dataInicialStr)
    const dataFinalDate = parseDateFromInput(dataFinalStr)
    
    // Combina data e hora
    const horaInicial = parseTimeFromInput(horaInicialStr)
    const horaFinal = parseTimeFromInput(horaFinalStr)
    
    let dataInicial = combineDateAndTime(dataInicialDate, horaInicial)
    let dataFinal = combineDateAndTime(dataFinalDate, horaFinal)
    
    // Se data final foi selecionada mas não tem hora, ajustar para o final do dia (23:59:59)
    if (dataFinal && !horaFinalStr) {
      dataFinal.setHours(23, 59, 59, 999)
    }
    // Se data inicial foi selecionada mas não tem hora, ajustar para o início do dia (00:00:00)
    if (dataInicial && !horaInicialStr) {
      dataInicial.setHours(0, 0, 0, 0)
    }
    
    onConfirm(dataInicial, dataFinal)
    onClose()
  }

  const handleClose = () => {
    // Resetar para valores iniciais ao fechar sem confirmar
    setDataInicialStr(formatDateForInput(initialDataInicial))
    setHoraInicialStr(formatTimeForInput(initialDataInicial))
    setDataFinalStr(formatDateForInput(initialDataFinal))
    setHoraFinalStr(formatTimeForInput(initialDataFinal))
    onClose()
  }

  // Calcular data mínima para data final (não pode ser anterior à data inicial)
  const minDataFinal = dataInicialStr || undefined

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleClose()
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
        {/* Header */}
        <div className="bg-white rounded-t-lg px-4 py-3 flex items-center justify-between border-b border-gray-200">
          <h2 className="text-lg font-bold font-exo text-primary-text">Escolha as Datas</h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center text-primary-text hover:bg-gray-100 rounded-full transition-colors"
          >
            <MdClose size={20} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="px-4 py-4 bg-white">
          <div className="space-y-4">
            {/* Data Inicial */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-nunito text-primary-text">Data Inicial</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MdCalendarToday className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text pointer-events-none" size={20} />
                  <input
                    type="date"
                    value={dataInicialStr}
                    onChange={(e) => setDataInicialStr(e.target.value)}
                    placeholder="Escolha..."
                    className="w-full h-10 pl-10 pr-4 rounded-lg bg-white border border-gray-300 text-sm font-nunito text-primary-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div className="relative flex-1">
                  <MdAccessTime className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text pointer-events-none" size={20} />
                  <input
                    type="time"
                    value={horaInicialStr}
                    onChange={(e) => setHoraInicialStr(e.target.value)}
                    placeholder="HH:mm"
                    className="w-full h-10 pl-10 pr-4 rounded-lg bg-white border border-gray-300 text-sm font-nunito text-primary-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Data Final */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-nunito text-primary-text">Data Final</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MdCalendarToday className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text pointer-events-none" size={20} />
                  <input
                    type="date"
                    value={dataFinalStr}
                    onChange={(e) => setDataFinalStr(e.target.value)}
                    min={minDataFinal}
                    placeholder="Escolha..."
                    className="w-full h-10 pl-10 pr-4 rounded-lg bg-white border border-gray-300 text-sm font-nunito text-primary-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div className="relative flex-1">
                  <MdAccessTime className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text pointer-events-none" size={20} />
                  <input
                    type="time"
                    value={horaFinalStr}
                    onChange={(e) => setHoraFinalStr(e.target.value)}
                    placeholder="HH:mm"
                    className="w-full h-10 pl-10 pr-4 rounded-lg bg-white border border-gray-300 text-sm font-nunito text-primary-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer com botão Filtrar */}
        <div className="px-4 py-3 bg-white rounded-b-lg border-t border-gray-200">
          <button
            onClick={handleConfirm}
            className="w-full h-10 bg-primary text-white rounded-lg flex items-center justify-center text-sm font-nunito hover:bg-primary/90 transition-colors"
          >
            Filtrar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

