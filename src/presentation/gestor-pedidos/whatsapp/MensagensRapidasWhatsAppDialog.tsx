'use client'

import { useCallback, useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/src/presentation/components/ui/dialog'
import { Button } from '@/src/presentation/components/ui/button'
import { Input } from '@/src/presentation/components/ui/input'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import {
  gravarPacoteMensagensFlow,
  lerPacoteMensagensFlow,
  type PacoteMensagensFlow,
} from './mensagensRapidasFlow'

type Props = {
  open: boolean
  onClose: () => void
}

export function MensagensRapidasWhatsAppDialog({ open, onClose }: Props) {
  const empresaId = useTenantEmpresaId() ?? ''
  const [pacote, setPacote] = useState<PacoteMensagensFlow>(() => lerPacoteMensagensFlow(empresaId))

  useEffect(() => {
    if (open) setPacote(lerPacoteMensagensFlow(empresaId))
  }, [open, empresaId])

  const persistir = useCallback(
    (next: PacoteMensagensFlow) => {
      setPacote(next)
      gravarPacoteMensagensFlow(empresaId, next)
    },
    [empresaId]
  )

  return (
    <Dialog open={open} onOpenChange={v => (!v ? onClose() : undefined)}>
      <DialogContent className="max-w-md">
        <DialogTitle>Configurar mensagens</DialogTitle>
        <p className="mt-1 text-xs text-secondary-text">
          Use {'{pix}'} no texto para incluir a chave. O envio continua na conversa do WhatsApp.
        </p>

        <label className="mt-3 block text-xs font-medium text-secondary-text">
          Chave PIX
          <Input
            className="mt-1"
            value={pacote.chavePix}
            onChange={e => persistir({ ...pacote, chavePix: e.target.value })}
            placeholder="CPF, e-mail, telefone ou chave aleatória"
          />
        </label>

        <div className="mt-3 flex max-h-72 flex-col gap-2 overflow-y-auto">
          {pacote.mensagens.map(msg => (
            <div key={msg.id} className="flex flex-col gap-1 rounded-lg border border-primary/10 p-2">
              <Input
                value={msg.titulo}
                onChange={e =>
                  persistir({
                    ...pacote,
                    mensagens: pacote.mensagens.map(m =>
                      m.id === msg.id ? { ...m, titulo: e.target.value } : m
                    ),
                  })
                }
                aria-label={`Título da mensagem ${msg.titulo}`}
              />
              <textarea
                className="min-h-[72px] w-full rounded-md border border-input px-3 py-2 text-sm"
                value={msg.corpo}
                onChange={e =>
                  persistir({
                    ...pacote,
                    mensagens: pacote.mensagens.map(m =>
                      m.id === msg.id ? { ...m, corpo: e.target.value } : m
                    ),
                  })
                }
                aria-label={`Texto da mensagem ${msg.titulo}`}
              />
            </div>
          ))}
        </div>

        <div className="mt-3 flex justify-end">
          <Button type="button" variant="outlined" onClick={onClose}>
            Concluir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
