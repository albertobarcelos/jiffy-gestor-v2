'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MdContentCopy, MdSettings } from 'react-icons/md'
import { Button } from '@/src/presentation/components/ui/button'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { MensagensRapidasWhatsAppDialog } from './MensagensRapidasWhatsAppDialog'
import { enviarMensagemRapidaWhatsApp } from './enviarMensagemRapidaWhatsApp'
import {
  lerPacoteMensagensFlow,
  type MensagemRapidaFlow,
  type PacoteMensagensFlow,
} from './mensagensRapidasFlow'

type Props = {
  onAviso: (texto: string) => void
  onCopiarTelefone: () => void
  configAberta: boolean
  onConfigAbertaChange: (aberta: boolean) => void
}

export function AtalhosWhatsAppSection({
  onAviso,
  onCopiarTelefone,
  configAberta,
  onConfigAbertaChange,
}: Props) {
  const empresaId = useTenantEmpresaId() ?? ''
  const [pacote, setPacote] = useState<PacoteMensagensFlow>(() => lerPacoteMensagensFlow(empresaId))
  const [enviandoId, setEnviandoId] = useState<string | null>(null)
  const enviandoRef = useRef(false)

  useEffect(() => {
    if (!configAberta) setPacote(lerPacoteMensagensFlow(empresaId))
  }, [configAberta, empresaId])

  const enviar = useCallback(
    async (msg: MensagemRapidaFlow) => {
      if (enviandoRef.current) return
      enviandoRef.current = true
      setEnviandoId(msg.id)
      try {
        const resultado = await enviarMensagemRapidaWhatsApp(msg, pacote.chavePix)
        onAviso(resultado.aviso)
        if (resultado.precisaConfigurarPix) onConfigAbertaChange(true)
      } finally {
        enviandoRef.current = false
        setEnviandoId(null)
      }
    },
    [onAviso, onConfigAbertaChange, pacote.chavePix]
  )

  return (
    <>
      <div className="mt-5 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary-text">
          Atalhos
        </p>
        <button
          type="button"
          onClick={() => onConfigAbertaChange(true)}
          className="rounded-md p-1 text-terciary-text transition hover:bg-primary-bg hover:text-secondary-text"
          aria-label="Configurar mensagens rápidas"
          title="Configurar mensagens"
        >
          <MdSettings size={16} aria-hidden />
        </button>
      </div>
      <div className="mt-2 flex flex-col gap-2">
        {pacote.mensagens.length === 0 ? (
          <p className="text-xs text-secondary-text">Nenhuma mensagem. Toque em configurar.</p>
        ) : (
          pacote.mensagens.map(msg => (
            <Button
              key={msg.id}
              type="button"
              variant="outlined"
              size="small"
              className="w-full justify-start !normal-case"
              disabled={Boolean(enviandoId)}
              onClick={() => void enviar(msg)}
            >
              {msg.titulo}
            </Button>
          ))
        )}
        <Button type="button" variant="outlined" className="w-full" onClick={onCopiarTelefone}>
          <MdContentCopy className="mr-1" size={16} aria-hidden />
          Copiar telefone
        </Button>
      </div>

      <MensagensRapidasWhatsAppDialog
        open={configAberta}
        onClose={() => onConfigAbertaChange(false)}
      />
    </>
  )
}
