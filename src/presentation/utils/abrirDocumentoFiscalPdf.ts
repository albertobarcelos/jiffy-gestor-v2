/**
 * Abre o PDF do documento fiscal (DANFE/DANFCE) na mesma rota usada pelo Kanban:
 * GET `/api/nfe/[documentoFiscalId]`.
 *
 * Sempre usa `fetchGestorApi` (Bearer per-tab). Nunca navega para `/api/nfe/...`
 * — o cookie `tenant-token` é last-wins entre abas e autenticaria a empresa errada.
 */
import { showToast } from '@/src/shared/utils/toast'
import { requestDocumentoFiscalPdfRetryChoice } from '@/src/presentation/utils/documentoFiscalPdfRetryModalStore'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'

const BLOB_URL_REVOKE_MS = 60_000

export function abrirPdfBlobEmNovaAba(pdf: Blob): void {
  const blobUrl = URL.createObjectURL(pdf)
  const opened = window.open(blobUrl, '_blank', 'noopener')
  if (!opened) {
    const a = document.createElement('a')
    a.href = blobUrl
    a.target = '_blank'
    a.rel = 'noopener'
    a.download = 'documento-fiscal.pdf'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), BLOB_URL_REVOKE_MS)
}

async function buscarPdfFiscal(url: string): Promise<Response> {
  return fetchGestorApi(url)
}

async function abrirPdfSePronto(response: Response): Promise<boolean> {
  if (!response.ok) return false
  const contentType = response.headers.get('content-type')
  if (!contentType?.includes('application/pdf')) return false
  const pdf = await response.blob()
  abrirPdfBlobEmNovaAba(pdf)
  return true
}

function agendarVerificacaoPdf(params: {
  url: string
  documentoLabel: string
}): void {
  let tentativas = 0
  const maxTentativas = 6

  const verificarPdfFiscal = async () => {
    tentativas++
    try {
      const retryResponse = await buscarPdfFiscal(params.url)
      if (await abrirPdfSePronto(retryResponse)) {
        return
      }

      if (tentativas < maxTentativas) {
        setTimeout(verificarPdfFiscal, 5000)
      } else {
        showToast.warning(
          `O ${params.documentoLabel} ainda não ficou pronto após algumas tentativas. Tente abrir de novo em instantes.`
        )
      }
    } catch {
      if (tentativas < maxTentativas) {
        setTimeout(verificarPdfFiscal, 5000)
      }
    }
  }

  setTimeout(verificarPdfFiscal, 5000)
}

export async function abrirDocumentoFiscalPdf(
  documentoFiscalId: string,
  tipoDocFiscal: 'NFE' | 'NFCE' | null | undefined
): Promise<void> {
  const url = `/api/nfe/${documentoFiscalId}`
  const documentoLabel = tipoDocFiscal === 'NFE' ? 'DANFE' : 'DANFCE'

  try {
    const response = await buscarPdfFiscal(url)

    if (await abrirPdfSePronto(response)) {
      return
    }

    if (response.ok) {
      const errorData = await response.json().catch(() => ({}))
      showToast.error(
        errorData.error || `Erro ao buscar ${documentoLabel}. Tente novamente mais tarde.`
      )
      return
    }

    if (response.status === 404) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage =
        errorData.error || `O ${documentoLabel} ainda não foi gerado.`
      const normalizedError = String(errorMessage).toUpperCase()
      const nonRetryableByMessage =
        normalizedError.includes('CANCELADA') ||
        normalizedError.includes('CANCELADO') ||
        normalizedError.includes('NÃO PODE SER GERADO') ||
        normalizedError.includes('NAO PODE SER GERADO')
      const nonRetryable = Boolean(errorData?.nonRetryable) || nonRetryableByMessage

      if (nonRetryable) {
        showToast.warning(errorMessage)
        return
      }

      const escolha = await requestDocumentoFiscalPdfRetryChoice({
        errorMessage,
        documentoLabel,
      })

      if (escolha === null) {
        return
      }

      if (escolha === 'regenerar') {
        try {
          const regenerarUrl = `/api/nfe/${documentoFiscalId}/regenerar`

          const regenerarResponse = await fetchGestorApi(regenerarUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          })

          if (regenerarResponse.ok) {
            const regenerarData = await regenerarResponse.json()
            showToast.success(
              regenerarData.mensagem ||
                `Geração de ${documentoLabel} iniciada. Aguarde alguns segundos; tentaremos abrir o PDF.`
            )

            setTimeout(() => {
              agendarVerificacaoPdf({ url, documentoLabel })
            }, 5000)
          } else {
            const errorRegenerar = await regenerarResponse.json().catch(() => ({}))
            showToast.error(
              `Erro ao regenerar ${documentoLabel}: ${errorRegenerar.error || errorRegenerar.message || 'Erro desconhecido'}`
            )
          }
        } catch (error) {
          console.error(`Erro ao regenerar ${documentoLabel}:`, error)
          showToast.error(`Erro ao regenerar ${documentoLabel}. Tente novamente mais tarde.`)
        }
      } else {
        showToast.info(`Consultando ${documentoLabel} automaticamente em alguns segundos…`)
        agendarVerificacaoPdf({ url, documentoLabel })
      }
      return
    }

    const errorData = await response.json().catch(() => ({}))
    showToast.error(
      errorData.error || `Erro ao buscar ${documentoLabel}. Tente novamente mais tarde.`
    )
  } catch (error) {
    console.error(`Erro ao verificar ${documentoLabel}:`, error)
    showToast.error(`Não foi possível verificar o ${documentoLabel}. Tente novamente.`)
  }
}

/** Deriva NFE/NFCe a partir do modelo SEFAZ (55 = NF-e, 65 = NFC-e), alinhado ao Kanban. */
export function tipoDocFiscalFromModelo(
  modelo: number | null | undefined
): 'NFE' | 'NFCE' | null {
  if (modelo === 55) return 'NFE'
  if (modelo === 65) return 'NFCE'
  return null
}
