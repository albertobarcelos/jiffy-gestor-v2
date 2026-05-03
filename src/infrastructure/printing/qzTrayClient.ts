'use client'

import { logImpressao } from '@/src/shared/utils/logImpressaoDelivery'

/**
 * QZ Tray — configuração opcional de confiança (certificado + assinatura).
 *
 * Sem isto, cada `connect`, impressão e chamadas como `printers.find` disparam o diálogo
 * "Untrusted website" no QZ Tray 2.x.
 *
 * Configure:
 * - `NEXT_PUBLIC_QZ_TRAY_SIGNING_ENABLED=true`
 * - Certificado público: `NEXT_PUBLIC_QZ_TRAY_CERTIFICATE_URL` (default `/qz-tray/signing/digital-certificate.txt`)
 * - Servidor: `QZ_TRAY_PRIVATE_KEY` (PEM; quebras como `\n` no .env) ou `QZ_TRAY_PRIVATE_KEY_PATH`
 * - Algoritmo (deve coincidir com o certificado gerado pelo processo da QZ): `NEXT_PUBLIC_QZ_TRAY_SIGN_ALGORITHM` e `QZ_TRAY_SIGN_ALGORITHM` (default SHA512)
 *
 * Documentação: https://qz.io/docs/signing
 */
let securitySetupPromise: Promise<void> | null = null

type QzModule = typeof import('qz-tray').default

function signingEnabledFromEnv(): boolean {
  return (
    typeof process !== 'undefined' &&
    process.env?.NEXT_PUBLIC_QZ_TRAY_SIGNING_ENABLED === 'true'
  )
}

function certUrlFromEnv(): string {
  const u = process.env.NEXT_PUBLIC_QZ_TRAY_CERTIFICATE_URL?.trim()
  return u && u.length > 0 ? u : '/qz-tray/signing/digital-certificate.txt'
}

function signAlgorithmFromEnv(): 'SHA1' | 'SHA256' | 'SHA512' {
  const raw = (process.env.NEXT_PUBLIC_QZ_TRAY_SIGN_ALGORITHM || 'SHA512').toUpperCase()
  if (raw === 'SHA1' || raw === 'SHA256') return raw
  return 'SHA512'
}

/**
 * Cliente: chamar antes de `qz.websocket.connect()`, `qz.print`, `qz.printers.*`.
 */
export async function ensureQzTraySecurity(qz: QzModule): Promise<void> {
  if (typeof window === 'undefined') return

  securitySetupPromise ||= (async () => {
    if (!signingEnabledFromEnv()) {
      logImpressao('qz seguranca.desligada_env', {})
      return
    }

    logImpressao('qz seguranca.tentativa_ativacao', { certUrl: certUrlFromEnv(), algoritmo: signAlgorithmFromEnv() })

    try {
      qz.security.setSignatureAlgorithm(signAlgorithmFromEnv())

      const certUrl = certUrlFromEnv()
      const certRes = await fetch(certUrl)
      if (!certRes.ok) {
        throw new Error(`Falha ao carregar certificado QZ (${certRes.status}) em ${certUrl}`)
      }
      const certificate = await certRes.text()
      if (!certificate.trim()) {
        throw new Error('Certificado QZ vazio')
      }

      qz.security.setCertificatePromise(async () => certificate)

      qz.security.setSignaturePromise(async (toSign: string) => {
        const { useAuthStore } = await import('@/src/presentation/stores/authStore')
        const auth = useAuthStore.getState().auth
        const token = auth?.getAccessToken()
        if (!token) {
          throw new Error('Faça login para assinar requisições do QZ Tray.')
        }
        logImpressao('qz seguranca.sign_requisicao', { bytesParaAssinar: toSign?.length ?? 0 })
        const res = await fetch('/api/gestor/qz-tray/sign', {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=UTF-8',
            Authorization: `Bearer ${token}`,
          },
          body: toSign,
        })
        const text = await res.text()
        if (!res.ok) {
          throw new Error(text || `Erro ${res.status} ao assinar mensagem QZ`)
        }
        return text.trim()
      })
      logImpressao('qz seguranca.ativa_cert_e_sign_promises', { ok: true })
    } catch (err) {
      console.warn(
        '[QZ Tray] Assinatura não aplicada (NEXT_PUBLIC_QZ_TRAY_SIGNING_ENABLED=true mas setup falhou):',
        err
      )
    }
  })()

  await securitySetupPromise
}

export async function loadQzTray(): Promise<QzModule> {
  const qz = (await import('qz-tray')).default
  await ensureQzTraySecurity(qz)
  return qz
}
