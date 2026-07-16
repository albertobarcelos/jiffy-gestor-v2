'use client'

import { useState, type HTMLAttributes, type ReactNode } from 'react'
import { MdContentCopy, MdExpandLess, MdExpandMore } from 'react-icons/md'
import { Button } from '@/src/presentation/components/ui/button'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { useDocumentoFiscal } from '@/src/presentation/hooks/useDocumentoFiscal'
import { showToast } from '@/src/shared/utils/toast'

interface PedidoDetalhesNotaFiscalProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  documentoFiscalId?: string | null
  statusFiscal?: string | null
}

function normalizarStatus(status?: string | null): string {
  return String(status ?? '')
    .trim()
    .toUpperCase()
}

function XmlBloco({
  titulo,
  xml,
  defaultOpen = true,
}: {
  titulo: string
  xml: string
  defaultOpen?: boolean
}) {
  const [aberto, setAberto] = useState(defaultOpen)

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(xml)
      showToast.success('XML copiado')
    } catch {
      showToast.error('Não foi possível copiar o XML')
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-gray-50/90 px-3 py-2">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
        >
          {aberto ? (
            <MdExpandLess className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          ) : (
            <MdExpandMore className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          )}
          <span className="font-nunito text-sm font-semibold text-primary">{titulo}</span>
        </button>
        <Button
          type="button"
          variant="outlined"
          size="small"
          className="!min-w-0 shrink-0 !px-2 !py-1"
          onClick={() => void handleCopiar()}
        >
          <span className="inline-flex items-center gap-1 text-xs">
            <MdContentCopy className="h-3.5 w-3.5" aria-hidden />
            Copiar
          </span>
        </Button>
      </div>
      {aberto && (
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all bg-slate-950 px-3 py-3 font-mono text-[11px] leading-relaxed text-slate-100">
          {xml}
        </pre>
      )}
    </div>
  )
}

export function PedidoDetalhesNotaFiscal({
  children,
  className = '',
  documentoFiscalId,
  statusFiscal,
  ...props
}: PedidoDetalhesNotaFiscalProps) {
  const { data, isLoading, isError, error } = useDocumentoFiscal(documentoFiscalId)
  const status = normalizarStatus(statusFiscal ?? data?.status)

  const xmlEnvio = data?.xmlEnvio?.trim() || ''
  const xmlRetorno = data?.xmlRetorno?.trim() || ''
  const xmlAutorizado = data?.xmlAutorizado?.trim() || ''

  const mostrarRetorno = status === 'REJEITADA' && Boolean(xmlRetorno)
  const mostrarAutorizado =
    (status === 'EMITIDA' || status === 'CANCELADA') && Boolean(xmlAutorizado)

  return (
    <div className={`space-y-3 ${className}`.trim()} {...props}>
      {children}

      {documentoFiscalId ? (
        <div className="space-y-3 pt-1">
          <h4 className="font-nunito text-sm font-semibold text-gray-700">XMLs do documento</h4>

          {isLoading && (
            <div className="flex justify-center py-4">
              <JiffyLoading size={28} />
            </div>
          )}

          {isError && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 font-nunito text-xs text-red-800">
              {error?.message || 'Não foi possível carregar os XMLs do documento.'}
            </p>
          )}

          {!isLoading && !isError && (
            <>
              {xmlEnvio ? (
                <XmlBloco titulo="XML de envio" xml={xmlEnvio} defaultOpen />
              ) : (
                <p className="font-nunito text-xs text-gray-500">
                  XML de envio não disponível para este documento.
                </p>
              )}

              {mostrarRetorno && (
                <XmlBloco titulo="XML de retorno (rejeição)" xml={xmlRetorno} defaultOpen />
              )}

              {mostrarAutorizado && (
                <XmlBloco titulo="XML autorizado" xml={xmlAutorizado} defaultOpen />
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
