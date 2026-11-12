'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useCanalWhatsAppDelivery } from '@/src/presentation/hooks/useCanalWhatsAppDelivery'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { estaEmSnooze } from '@/src/presentation/components/features/kanban/rules/whatsappKanbanAviso.storage'
import {
  exibirToastAvisoCanalWhatsAppKanban,
  TOAST_AVISO_WHATSAPP_KANBAN_ID,
} from '@/src/presentation/components/features/kanban/components/AvisoCanalWhatsAppKanbanToast'
import { showToast } from '@/src/shared/utils/toast'

/**
 * Aviso de canal WhatsApp ao entrar no Kanban (toast + painel lateral).
 */
export function useAvisoCanalWhatsAppKanban() {
  const empresaId = useTenantEmpresaId()
  const { data: canal, isLoading, isSuccess, isError } = useCanalWhatsAppDelivery()

  const [painelConfigOpen, setPainelConfigOpen] = useState(false)
  const dispensadoNestaVisitaRef = useRef(false)

  const canalConectado = isSuccess && canal?.conectado === true

  useEffect(() => {
    dispensadoNestaVisitaRef.current = false
    setPainelConfigOpen(false)
    showToast.dismiss(TOAST_AVISO_WHATSAPP_KANBAN_ID)
  }, [empresaId])

  const abrirPainelPeloToast = useCallback(() => {
    dispensadoNestaVisitaRef.current = true
    setPainelConfigOpen(true)
  }, [])

  useEffect(() => {
    if (!empresaId || isLoading || dispensadoNestaVisitaRef.current) return
    if (estaEmSnooze(empresaId)) return
    if (canalConectado) {
      showToast.dismiss(TOAST_AVISO_WHATSAPP_KANBAN_ID)
      return
    }
    if (!(isSuccess || isError)) return

    exibirToastAvisoCanalWhatsAppKanban({
      empresaId,
      onConfigurar: abrirPainelPeloToast,
    })
    dispensadoNestaVisitaRef.current = true
  }, [
    empresaId,
    isLoading,
    isSuccess,
    isError,
    canalConectado,
    abrirPainelPeloToast,
  ])

  useEffect(() => {
    if (!painelConfigOpen || !canalConectado) return
    setPainelConfigOpen(false)
  }, [painelConfigOpen, canalConectado])

  const fecharPainelConfig = useCallback(() => {
    setPainelConfigOpen(false)
  }, [])

  return {
    painelConfigOpen,
    fecharPainelConfig,
    canalConectado,
  }
}
