'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/src/presentation/components/ui/dialog'
import { Button } from '@/src/presentation/components/ui/button'
import { useEmitirNfe, useEmitirNfeGestor } from '@/src/presentation/hooks/useVendas'
import { showToast } from '@/src/shared/utils/toast'

interface EmitirNfeModalProps {
  open: boolean
  onClose: () => void
  vendaId: string
  vendaNumero?: string
  tabelaOrigem?: 'venda' | 'venda_gestor' // Indica de qual tabela é a venda
  modeloInicial?: 55 | 65
}

export function EmitirNfeModal({
  open,
  onClose,
  vendaId,
  vendaNumero,
  tabelaOrigem = 'venda',
  modeloInicial = 65,
}: EmitirNfeModalProps) {
  const emitirNfePdv = useEmitirNfe()
  const emitirNfeGestor = useEmitirNfeGestor()
  
  // Usar o hook correto baseado na tabela de origem
  const emitirNfe = tabelaOrigem === 'venda_gestor' ? emitirNfeGestor : emitirNfePdv
  const [formData, setFormData] = useState(() => ({
    modelo: modeloInicial, // 55 = NF-e, 65 = NFC-e
  }))
  
  // Estado para controlar se está processando (desabilita botão imediatamente)
  const [emissaoEmProcessamento, setEmissaoEmProcessamento] = useState(false)

  useEffect(() => {
    if (!open) return

    setFormData({
      modelo: modeloInicial,
    })
  }, [open, modeloInicial])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Desabilitar botão imediatamente
    if (emissaoEmProcessamento) return
    
    setEmissaoEmProcessamento(true)

    try {
      await emitirNfe.mutateAsync({
        id: vendaId,
        modelo: formData.modelo,
      })

      // Fluxo assíncrono: fecha após enviar e acompanha status no kanban.
      onClose()
    } catch (error) {
      // Erro de rede/servidor já é tratado pelo hook com toast
      console.error('Erro ao emitir NFe:', error)
    } finally {
      setEmissaoEmProcessamento(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent sx={{ maxWidth: 500 }}>
        <DialogHeader>
          <DialogTitle>Emitir {formData.modelo === 55 ? 'NFe' : 'NFCe'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {vendaNumero && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Venda
                </label>
                <p className="text-sm text-gray-600">#{vendaNumero}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Modelo *
              </label>
              <select
                value={formData.modelo}
                onChange={(e) => setFormData({ ...formData, modelo: Number(e.target.value) as 55 | 65 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value={55}>55 - NF-e (Nota Fiscal Eletrônica)</option>
                <option value={65}>65 - NFC-e (Nota Fiscal de Consumidor Eletrônica)</option>
              </select>
            </div>

          </div>

          <DialogFooter sx={{ mt: 3 }}>
            <Button 
              type="button" 
              variant="outlined" 
              onClick={onClose}
              disabled={emissaoEmProcessamento || emitirNfe.isPending}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              isLoading={emissaoEmProcessamento || emitirNfe.isPending}
              disabled={emissaoEmProcessamento || emitirNfe.isPending}
            >
              {emissaoEmProcessamento || emitirNfe.isPending
                ? 'Emitindo...'
                : `Emitir ${formData.modelo === 55 ? 'NFe' : 'NFCe'}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
