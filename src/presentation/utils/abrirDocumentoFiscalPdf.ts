/**
 * Abre o PDF do documento fiscal (DANFE/DANFCE) na mesma rota usada pelo Kanban:
 * GET `/api/nfe/[documentoFiscalId]`.
 */
import { showToast } from '@/src/shared/utils/toast'
import { requestDocumentoFiscalPdfRetryChoice } from '@/src/presentation/utils/documentoFiscalPdfRetryModalStore'

export async function abrirDocumentoFiscalPdf(
  documentoFiscalId: string,
  tipoDocFiscal: 'NFE' | 'NFCE' | null | undefined
): Promise<void> {
  const url = `/api/nfe/${documentoFiscalId}`
  const documentoLabel = tipoDocFiscal === 'NFE' ? 'DANFE' : 'DANFCE'

  try {
    const response = await fetch(url)

    if (response.ok) {
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/pdf')) {
        window.open(url, '_blank')
      } else {
        const errorData = await response.json().catch(() => ({}))
        showToast.error(
          errorData.error || `Erro ao buscar ${documentoLabel}. Tente novamente mais tarde.`
        )
      }
    } else if (response.status === 404) {
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

      // Erro definitivo (ex.: documento cancelado): apenas aviso, sem modal de regenerar/retry.
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

          const regenerarResponse = await fetch(regenerarUrl, {
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

            setTimeout(async () => {
              let tentativas = 0
              const maxTentativas = 6

              const verificarPdfFiscal = async () => {
                tentativas++
                try {
                  const retryResponse = await fetch(url)
                  if (retryResponse.ok) {
                    const ct = retryResponse.headers.get('content-type')
                    if (ct?.includes('application/pdf')) {
                      window.open(url, '_blank')
                      return
                    }
                  }

                  if (tentativas < maxTentativas) {
                    setTimeout(verificarPdfFiscal, 5000)
                  } else {
                    showToast.warning(
                      `O ${documentoLabel} ainda não ficou pronto após algumas tentativas. Tente abrir de novo em instantes.`
                    )
                  }
                } catch {
                  if (tentativas < maxTentativas) {
                    setTimeout(verificarPdfFiscal, 5000)
                  }
                }
              }

              setTimeout(verificarPdfFiscal, 5000)
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
        let tentativas = 0
        const maxTentativas = 6

        showToast.info(`Consultando ${documentoLabel} automaticamente em alguns segundos…`)

        const verificarPdfFiscal = async () => {
          tentativas++
          try {
            const retryResponse = await fetch(url)
            if (retryResponse.ok) {
              const ct = retryResponse.headers.get('content-type')
              if (ct?.includes('application/pdf')) {
                window.open(url, '_blank')
                return
              }
            }

            if (tentativas < maxTentativas) {
              setTimeout(verificarPdfFiscal, 5000)
            } else {
              showToast.warning(
                `O ${documentoLabel} ainda não ficou pronto após algumas tentativas. Tente novamente mais tarde.`
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
    } else {
      const errorData = await response.json().catch(() => ({}))
      showToast.error(
        errorData.error || `Erro ao buscar ${documentoLabel}. Tente novamente mais tarde.`
      )
    }
  } catch (error) {
    console.error(`Erro ao verificar ${documentoLabel}:`, error)
    showToast.error(`Não foi possível verificar o ${documentoLabel}. Tente abrir o link manualmente.`)
    window.open(url, '_blank')
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
