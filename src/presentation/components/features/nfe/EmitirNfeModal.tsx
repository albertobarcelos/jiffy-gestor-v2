'use client'

import { useState } from 'react'
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
}

export function EmitirNfeModal({ open, onClose, vendaId, vendaNumero, tabelaOrigem = 'venda' }: EmitirNfeModalProps) {
  const emitirNfePdv = useEmitirNfe()
  const emitirNfeGestor = useEmitirNfeGestor()
  
  // Usar o hook correto baseado na tabela de origem
  const emitirNfe = tabelaOrigem === 'venda_gestor' ? emitirNfeGestor : emitirNfePdv
  const [formData, setFormData] = useState({
    modelo: 65 as 55 | 65, // 55 = NF-e, 65 = NFC-e
    serie: 1,
    ambiente: 'PRODUCAO' as 'HOMOLOGACAO' | 'PRODUCAO',
    crt: 1 as 1 | 2 | 3, // 1=Simples Nacional, 2=Simples Excesso, 3=Regime Normal
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await emitirNfe.mutateAsync({
        id: vendaId,
        modelo: formData.modelo,
        serie: formData.serie,
        ambiente: formData.ambiente,
        crt: formData.crt,
      })
      onClose()
    } catch (error) {
      // Erro já é tratado pelo hook com toast
      console.error('Erro ao emitir NFe:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent sx={{ maxWidth: 500 }}>
        <DialogHeader>
          <DialogTitle>Emitir Nota Fiscal</DialogTitle>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Série *
              </label>
              <input
                type="number"
                min="1"
                value={formData.serie}
                onChange={(e) => setFormData({ ...formData, serie: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ambiente *
              </label>
              <select
                value={formData.ambiente}
                onChange={(e) => setFormData({ ...formData, ambiente: e.target.value as 'HOMOLOGACAO' | 'PRODUCAO' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="HOMOLOGACAO">Homologação</option>
                <option value="PRODUCAO">Produção</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CRT (Código de Regime Tributário) *
              </label>
              <select
                value={formData.crt}
                onChange={(e) => setFormData({ ...formData, crt: Number(e.target.value) as 1 | 2 | 3 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value={1}>1 - Simples Nacional</option>
                <option value={2}>2 - Simples Nacional - Excesso de Sublimite</option>
                <option value={3}>3 - Regime Normal</option>
              </select>
            </div>
          </div>

          <DialogFooter sx={{ mt: 3 }}>
            <Button type="button" variant="outlined" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" isLoading={emitirNfe.isPending}>
              Emitir NFe
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
