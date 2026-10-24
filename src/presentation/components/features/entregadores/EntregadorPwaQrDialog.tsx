'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/presentation/components/ui/dialog'
import { urlInstalacaoPwaEntregador } from '@/src/application/expedicao/app/urlInstalacaoPwaEntregador'
import { showToast } from '@/src/shared/utils/toast'

type EntregadorPwaQrDialogProps = {
  open: boolean
  onClose: () => void
}

export function EntregadorPwaQrDialog({ open, onClose }: EntregadorPwaQrDialogProps) {
  const [src, setSrc] = useState<string | null>(null)
  const [url, setUrl] = useState('')

  useEffect(() => {
    if (!open) {
      setSrc(null)
      return
    }
    const destino = urlInstalacaoPwaEntregador(
      typeof window !== 'undefined' ? window.location.origin : ''
    )
    setUrl(destino)
    let cancelado = false
    void QRCode.toDataURL(destino, {
      width: 280,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#1f1433', light: '#ffffff' },
    })
      .then(dataUrl => {
        if (!cancelado) setSrc(dataUrl)
      })
      .catch(() => {
        if (!cancelado) setSrc(null)
      })
    return () => {
      cancelado = true
    }
  }, [open])

  const copiar = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      showToast.success('Link copiado.')
    } catch {
      showToast.error('Não foi possível copiar o link.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={aberto => !aberto && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Instalar o app do entregador</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-secondary-text">
          O motoboy aponta a câmera, abre o link e toca em Adicionar à tela inicial. A
          sessão da loja ele faz uma vez no celular.
        </p>
        <div className="mt-4 flex flex-col items-center gap-3">
          {src ? (
            <img
              src={src}
              alt="QR Code do app do entregador"
              className="h-56 w-56 rounded-lg border border-gray-200 bg-white p-2"
            />
          ) : (
            <div className="flex h-56 w-56 items-center justify-center rounded-lg border border-dashed border-gray-200 text-sm text-secondary-text">
              Gerando QR…
            </div>
          )}
          <p className="break-all text-center text-xs text-secondary-text">{url}</p>
        </div>
        <DialogFooter className="mt-4 gap-2 sm:gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={() => void copiar()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Copiar link
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
