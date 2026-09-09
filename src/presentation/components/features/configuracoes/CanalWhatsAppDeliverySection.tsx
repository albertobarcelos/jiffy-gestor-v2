'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FaWhatsapp } from 'react-icons/fa'
import { MdCheckCircle } from 'react-icons/md'
import { useQueryClient } from '@tanstack/react-query'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { JiffyConfirmDialog } from '@/src/presentation/components/ui/jiffy-confirm-dialog'
import { showToast } from '@/src/shared/utils/toast'
import { MENSAGEM_CANAL_WHATSAPP_INDISPONIVEL_SUPORTE } from '@/src/shared/utils/canalWhatsAppFalha'
import type { CanalWhatsAppDeliveryDTO } from '@/src/application/dto/delivery/CanalWhatsAppDeliveryDTO'
import { QR_CODE_WHATSAPP_VALIDADE_MS } from '@/src/application/dto/delivery/CanalWhatsAppDeliveryDTO'
import {
  devePollarStatusCanalWhatsApp,
  srcImagemQrCodeWhatsApp,
} from '@/src/application/mappers/CanalWhatsAppDeliveryMapper'
import {
  CANAL_WHATSAPP_QUERY_KEY,
  CANAL_WHATSAPP_STATUS_QUERY_KEY,
  CanalWhatsAppHttpError,
  isCanalWhatsAppIndisponivelError,
  useCanalWhatsAppDelivery,
  useCanalWhatsAppStatus,
  useRemoverCanalWhatsApp,
  useRenovarQrCodeCanalWhatsApp,
  useSubstituirCanalWhatsApp,
} from '@/src/presentation/hooks/useCanalWhatsAppDelivery'
import { dispararEmpresaDeliveryAtualizada } from '@/src/presentation/hooks/useEmpresaDeliveryMe'
import { buildTenantQueryKey } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'

type SessaoQr = {
  base64: string | null
  pairingCode: string | null
  recebidoEm: number
}

function aplicarSessaoQr(canal: CanalWhatsAppDeliveryDTO): SessaoQr | null {
  const base64 = canal.qrcode?.base64?.trim() || null
  const pairingCode = canal.qrcode?.pairingCode?.trim() || null
  if (!base64 && !pairingCode) return null
  return { base64, pairingCode, recebidoEm: Date.now() }
}

export function CanalWhatsAppDeliverySection({
  onConectadoChange,
}: {
  onConectadoChange?: (conectado: boolean) => void
}) {
  const canalQuery = useCanalWhatsAppDelivery()
  const substituir = useSubstituirCanalWhatsApp()
  const renovarQr = useRenovarQrCodeCanalWhatsApp()
  const remover = useRemoverCanalWhatsApp()
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  const [sessaoQr, setSessaoQr] = useState<SessaoQr | null>(null)
  const [qrExpirado, setQrExpirado] = useState(false)
  const [confirmDesconectar, setConfirmDesconectar] = useState(false)
  const autoQrRef = useRef(false)
  const sessaoQrRef = useRef(sessaoQr)
  sessaoQrRef.current = sessaoQr

  const canal = canalQuery.data ?? null
  const srcQr = srcImagemQrCodeWhatsApp(sessaoQr?.base64)
  // Poll só enquanto o QR está na tela. Não usa `canal.conectado` — depois do PUT
  // o GET antigo pode ainda dizer conectado e cortaria o poll cedo demais.
  const pollar = devePollarStatusCanalWhatsApp({
    conectado: false,
    temQrVisivel: Boolean(srcQr),
    qrExpirado,
  })

  const statusQuery = useCanalWhatsAppStatus({
    enabled: canal != null || sessaoQr != null,
    pollar,
  })

  const statusVivo = statusQuery.data
  const conectadoAgora = statusVivo ? statusVivo.conectado : canal?.conectado === true
  const refetchCanal = canalQuery.refetch
  const ocupado = substituir.isPending || renovarQr.isPending || remover.isPending

  useEffect(() => {
    onConectadoChange?.(conectadoAgora)
  }, [conectadoAgora, onConectadoChange])

  useEffect(() => {
    if (!sessaoQr) {
      setQrExpirado(false)
      return
    }
    const restante = QR_CODE_WHATSAPP_VALIDADE_MS - (Date.now() - sessaoQr.recebidoEm)
    if (restante <= 0) {
      setQrExpirado(true)
      return
    }
    const id = window.setTimeout(() => setQrExpirado(true), restante)
    return () => window.clearTimeout(id)
  }, [sessaoQr])

  useEffect(() => {
    if (!statusVivo?.conectado) return
    const veioDoQr = sessaoQrRef.current != null
    setSessaoQr(null)
    setQrExpirado(false)
    autoQrRef.current = false
    queryClient.setQueryData<CanalWhatsAppDeliveryDTO | null>(
      buildTenantQueryKey(empresaId, CANAL_WHATSAPP_QUERY_KEY),
      atual => (atual ? { ...atual, conectado: true, status: 'conectado' } : atual)
    )
    dispararEmpresaDeliveryAtualizada()
    void refetchCanal().then(() => {
      queryClient.setQueryData<CanalWhatsAppDeliveryDTO | null>(
        buildTenantQueryKey(empresaId, CANAL_WHATSAPP_QUERY_KEY),
        atual => (atual ? { ...atual, conectado: true, status: 'conectado' } : atual)
      )
    })
    if (veioDoQr) {
      showToast.success('WhatsApp conectado.')
    }
  }, [statusVivo?.conectado, refetchCanal, queryClient, empresaId])

  useEffect(() => {
    if (statusVivo?.status !== 'desconectado') return
    if (sessaoQr) return
    queryClient.setQueryData<CanalWhatsAppDeliveryDTO | null>(
      buildTenantQueryKey(empresaId, CANAL_WHATSAPP_QUERY_KEY),
      atual => (atual ? { ...atual, conectado: false, status: 'desconectado' } : atual)
    )
  }, [statusVivo?.status, queryClient, empresaId, sessaoQr])

  const registrarQr = useCallback(
    (data: CanalWhatsAppDeliveryDTO) => {
      const proxima = aplicarSessaoQr(data)
      setSessaoQr(proxima)
      setQrExpirado(false)
      autoQrRef.current = true
      queryClient.setQueryData(
        buildTenantQueryKey(empresaId, CANAL_WHATSAPP_STATUS_QUERY_KEY),
        {
          instanceName: data.instanceName,
          status: 'conectando' as const,
          conectado: false,
        }
      )
      queryClient.setQueryData<CanalWhatsAppDeliveryDTO | null>(
        buildTenantQueryKey(empresaId, CANAL_WHATSAPP_QUERY_KEY),
        { ...data, conectado: false, status: 'conectando' }
      )
    },
    [empresaId, queryClient]
  )

  useEffect(() => {
    if (autoQrRef.current) return
    if (!canal || canal.conectado || canal.status !== 'conectando') return
    if (sessaoQr) return
    autoQrRef.current = true
    void renovarQr
      .mutateAsync()
      .then(registrarQr)
      .catch(erro => {
        autoQrRef.current = false
        if (isCanalWhatsAppIndisponivelError(erro)) return
        showToast.error(erro instanceof Error ? erro.message : 'Não foi possível obter o QR Code.')
      })
  }, [canal, registrarQr, renovarQr, sessaoQr])

  const tratarErro = useCallback((erro: unknown, fallback: string) => {
    if (isCanalWhatsAppIndisponivelError(erro)) return
    showToast.error(erro instanceof Error ? erro.message : fallback)
  }, [])

  const conectarNovo = useCallback(async () => {
    try {
      const data = await substituir.mutateAsync()
      registrarQr(data)
    } catch (erro) {
      tratarErro(erro, 'Não foi possível conectar o WhatsApp.')
    }
  }, [registrarQr, substituir, tratarErro])

  const renovar = useCallback(async () => {
    try {
      const data = await renovarQr.mutateAsync()
      registrarQr(data)
    } catch (erro) {
      if (erro instanceof CanalWhatsAppHttpError && erro.status === 404) {
        await conectarNovo()
        return
      }
      tratarErro(erro, 'Não foi possível gerar um novo QR Code.')
    }
  }, [conectarNovo, registrarQr, renovarQr, tratarErro])

  const iniciarConexao = useCallback(async () => {
    if (canal?.conectado) return
    if (canal) {
      await renovar()
      return
    }
    await conectarNovo()
  }, [canal, conectarNovo, renovar])

  const confirmarDesconectar = useCallback(async () => {
    try {
      await remover.mutateAsync()
      setSessaoQr(null)
      setQrExpirado(false)
      autoQrRef.current = false
      setConfirmDesconectar(false)
      showToast.success('WhatsApp desconectado.')
    } catch (erro) {
      tratarErro(erro, 'Não foi possível desconectar o WhatsApp.')
    }
  }, [remover, tratarErro])

  const indisponivel = useMemo(
    () =>
      isCanalWhatsAppIndisponivelError(canalQuery.error) ||
      isCanalWhatsAppIndisponivelError(statusQuery.error),
    [canalQuery.error, statusQuery.error]
  )

  if (canalQuery.isPending) {
    return (
      <div className="flex justify-center py-10">
        <JiffyLoading />
      </div>
    )
  }

  if (indisponivel) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p>{MENSAGEM_CANAL_WHATSAPP_INDISPONIVEL_SUPORTE}</p>
        <button
          type="button"
          onClick={() => void canalQuery.refetch()}
          className="mt-2 text-sm font-semibold text-primary underline-offset-2 hover:underline"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  if (canalQuery.isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <p>{canalQuery.error.message}</p>
        <button
          type="button"
          onClick={() => void canalQuery.refetch()}
          className="mt-2 text-sm font-semibold text-primary underline-offset-2 hover:underline"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <>
      {conectadoAgora ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <MdCheckCircle className="h-5 w-5" aria-hidden />
            WhatsApp conectado
          </div>
          <p className="text-xs text-secondary-text">
            O número da loja já pode avisar o cliente sobre o pedido.
          </p>
          <button
            type="button"
            onClick={() => setConfirmDesconectar(true)}
            disabled={ocupado}
            className="w-fit rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            Desconectar
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {srcQr ? (
            <div className="flex flex-col items-center gap-3">
              <div
                className={`rounded-2xl p-1 ${
                  qrExpirado ? '' : 'ring-2 ring-secondary/40 ring-offset-2 ring-offset-white'
                }`}
              >
                <img
                  src={srcQr}
                  alt="QR Code para conectar o WhatsApp da loja"
                  className={`h-56 w-56 rounded-xl border border-gray-200 bg-white p-2 ${
                    qrExpirado ? 'opacity-40' : ''
                  }`}
                />
              </div>
              {sessaoQr?.pairingCode ? (
                <p className="text-sm text-primary-text">
                  Código: <span className="font-semibold tracking-wide">{sessaoQr.pairingCode}</span>
                </p>
              ) : null}
              {qrExpirado ? (
                <p className="text-center text-sm text-secondary-text">
                  Este QR Code expirou. Gere um novo para continuar.
                </p>
              ) : (
                <>
                  <p className="flex items-center gap-2 text-sm font-semibold text-secondary">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-secondary" aria-hidden />
                    Aguardando leitura do QR Code…
                  </p>
                  <p className="max-w-sm text-center text-sm text-secondary-text">
                    No celular, abra o WhatsApp → Aparelhos conectados → Conectar um aparelho e
                    aponte a câmera para o QR Code. Esta tela atualiza sozinha quando conectar.
                  </p>
                </>
              )}
              <button
                type="button"
                onClick={() => void renovar()}
                disabled={ocupado}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {ocupado ? 'Gerando…' : 'Gerar novo QR'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void iniciarConexao()}
              disabled={ocupado}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
            >
              <FaWhatsapp className="h-4 w-4" aria-hidden />
              {ocupado ? 'Conectando…' : 'Conectar WhatsApp'}
            </button>
          )}
        </div>
      )}

      <JiffyConfirmDialog
        open={confirmDesconectar}
        onOpenChange={open => {
          if (!remover.isPending) setConfirmDesconectar(open)
        }}
        title="Desconectar WhatsApp?"
        description="Os avisos automáticos do pedido param até você conectar de novo."
        cancelLabel="Cancelar"
        confirmLabel="Desconectar"
        confirmButtonClassName="bg-red-600 hover:bg-red-700"
        busy={remover.isPending}
        onConfirm={() => void confirmarDesconectar()}
      />
    </>
  )
}
