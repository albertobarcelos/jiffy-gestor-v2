'use client'

import { useCallback, useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/src/presentation/components/ui/dialog'
import { Button } from '@/src/presentation/components/ui/button'
import { Input } from '@/src/presentation/components/ui/input'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import {
  aplicarVariaveisMensagem,
  gravarPacoteMensagensFlow,
  lerPacoteMensagensFlow,
  type MensagemRapidaFlow,
  type PacoteMensagensFlow,
} from './mensagensRapidasFlow'
import { whatsappInserirTexto } from './tauriWhatsAppBridge'

type Props = {
  open: boolean
  onClose: () => void
  onAviso: (texto: string) => void
}

export function MensagensRapidasWhatsAppDialog({ open, onClose, onAviso }: Props) {
  const empresaId = useTenantEmpresaId() ?? ''
  const [pacote, setPacote] = useState<PacoteMensagensFlow>(() => lerPacoteMensagensFlow(empresaId))
  const [editando, setEditando] = useState(false)

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

  const enviar = useCallback(
    async (msg: MensagemRapidaFlow) => {
      const texto = aplicarVariaveisMensagem(msg.corpo, pacote.chavePix)
      if (msg.id === 'pix' && !pacote.chavePix.trim()) {
        onAviso('Configure a chave PIX nas mensagens.')
        setEditando(true)
        return
      }
      try {
        await navigator.clipboard.writeText(texto)
      } catch {
        /* segue para colar no WhatsApp */
      }
      try {
        const ok = await whatsappInserirTexto(texto)
        onAviso(ok ? 'Mensagem pronta no WhatsApp. Confira e envie.' : 'Mensagem copiada. Cole no WhatsApp (Ctrl+V).')
        if (ok) onClose()
      } catch {
        onAviso('Mensagem copiada. Cole no WhatsApp (Ctrl+V).')
      }
    },
    [onAviso, onClose, pacote.chavePix]
  )

  return (
    <Dialog open={open} onOpenChange={v => (!v ? onClose() : undefined)}>
      <DialogContent className="max-w-md">
        <DialogTitle>Mensagens rápidas</DialogTitle>
        <p className="mt-1 text-xs text-secondary-text">
          Use {'{pix}'} no texto para incluir a chave. A mensagem entra na conversa aberta; o envio é
          no WhatsApp.
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

        <div className="mt-3 flex flex-col gap-2">
          {pacote.mensagens.map(msg => (
            <div key={msg.id} className="rounded-lg border border-primary/10 p-2">
              {editando ? (
                <div className="flex flex-col gap-1">
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
                  />
                </div>
              ) : (
                <button type="button" className="w-full text-left" onClick={() => void enviar(msg)}>
                  <p className="text-sm font-medium text-primary-text">{msg.titulo}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-secondary-text">
                    {aplicarVariaveisMensagem(msg.corpo, pacote.chavePix)}
                  </p>
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-3 flex justify-end gap-2">
          <Button type="button" variant="outlined" onClick={() => setEditando(v => !v)}>
            {editando ? 'Concluir' : 'Configurar'}
          </Button>
          <Button type="button" variant="outlined" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
