/**
 * Abre o PDF do documento fiscal (DANFE/DANFCE) na mesma rota usada pelo Kanban:
 * GET `/api/nfe/[documentoFiscalId]`.
 */
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
        alert(
          errorData.error ||
            `Erro ao buscar ${documentoLabel}. Tente novamente mais tarde.`
        )
      }
    } else if (response.status === 404) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage =
        errorData.error || `O ${documentoLabel} ainda não foi gerado.`

      const opcao = confirm(
        `${errorMessage}\n\n` +
          `Escolha uma opção:\n` +
          `OK = Regenerar ${documentoLabel} agora\n` +
          `Cancelar = Aguardar e tentar novamente automaticamente`
      )

      if (opcao) {
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
            alert(
              `✅ ${regenerarData.mensagem || `Geração de ${documentoLabel} iniciada. Aguarde alguns segundos e tente novamente.`}`
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
                    alert(
                      `O ${documentoLabel} ainda não foi gerado após 30 segundos. Por favor, tente novamente mais tarde.`
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
            alert(
              `Erro ao regenerar ${documentoLabel}: ${errorRegenerar.error || errorRegenerar.message || 'Erro desconhecido'}`
            )
          }
        } catch (error) {
          console.error(`Erro ao regenerar ${documentoLabel}:`, error)
          alert(`Erro ao regenerar ${documentoLabel}. Tente novamente mais tarde.`)
        }
      } else {
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
              alert(
                `O ${documentoLabel} ainda não foi gerado após 30 segundos. Por favor, tente novamente mais tarde.`
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
      alert(
        errorData.error ||
          `Erro ao buscar ${documentoLabel}. Tente novamente mais tarde.`
      )
    }
  } catch (error) {
    console.error(`Erro ao verificar ${documentoLabel}:`, error)
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
