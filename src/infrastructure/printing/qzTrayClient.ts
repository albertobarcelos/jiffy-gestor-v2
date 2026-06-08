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

/** Erro típico quando o Next invalida chunks após HMR/recompilação em dev. */
export function isQzChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const msg = error.message.toLowerCase()
  return (
    msg.includes('loading chunk') ||
    msg.includes('chunkloaderror') ||
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('importing a module script failed')
  )
}

function isQzAlreadyConnectedError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('already exists')
}

function isQzConnectInProgressError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes('has not returned yet') ||
      error.message.includes('Waiting for previous disconnect'))
  )
}

function isQzSendDataError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('sendData is not a function')
}

let qzConnectPromise: Promise<void> | null = null

async function waitForQzConnection(qz: QzModule, timeoutMs = 20_000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      await qz.websocket.connect()
      return
    } catch (error) {
      if (isQzAlreadyConnectedError(error)) return
      if (isQzConnectInProgressError(error)) {
        await new Promise(resolve => setTimeout(resolve, 100))
        continue
      }
      throw error
    }
  }
  throw new Error('Timeout aguardando conexão com QZ Tray.')
}

/**
 * Garante uma única conexão WebSocket ativa (evita corrida com Strict Mode / múltiplos painéis).
 * Só retorna quando o socket está pronto para `printers.*` e `print`.
 */
export async function ensureQzWebsocketConnected(qz: QzModule): Promise<void> {
  if (qzConnectPromise) {
    return qzConnectPromise
  }

  qzConnectPromise = (async () => {
    if (!qz.websocket.isActive()) {
      await qz.websocket.connect()
      return
    }
    await waitForQzConnection(qz)
  })()

  try {
    await qzConnectPromise
  } catch (error) {
    qzConnectPromise = null
    throw error
  }
}

function normalizarListaImpressorasWindows(
  found: string[] | string,
  details: Array<{ name?: string }> | { name?: string }
): string[] {
  let printers =
    Array.isArray(found)
      ? found
      : typeof found === 'string' && found.trim()
        ? [found.trim()]
        : []

  if (printers.length === 0) {
    const arr = Array.isArray(details) ? details : [details]
    printers = arr
      .map(p => (p && typeof p.name === 'string' ? p.name.trim() : ''))
      .filter(Boolean)
  }

  return [...new Set(printers)].sort((a, b) => a.localeCompare(b))
}

/** Lista impressoras Windows via QZ Tray (conexão serializada + retry em sendData). */
export async function listQzWindowsPrinters(qz: QzModule): Promise<string[]> {
  await ensureQzWebsocketConnected(qz)

  const buscar = async () => {
    const found = await qz.printers.find()
    const hasFound =
      (Array.isArray(found) && found.length > 0) ||
      (typeof found === 'string' && found.trim().length > 0)
    if (hasFound) {
      return normalizarListaImpressorasWindows(found, [])
    }
    const details = await qz.printers.details()
    return normalizarListaImpressorasWindows([], details)
  }

  try {
    return await buscar()
  } catch (error) {
    if (!isQzSendDataError(error)) throw error
    qzConnectPromise = null
    await qz.websocket.disconnect().catch(() => undefined)
    await ensureQzWebsocketConnected(qz)
    return buscar()
  }
}

export function mensagemErroCarregarQzTray(error: unknown): string {
  if (isQzChunkLoadError(error)) {
    return 'Falha ao carregar o módulo de impressão (atualização da página em andamento). Recarregue (F5) e abra as configurações novamente.'
  }
  if (isQzSendDataError(error)) {
    return 'QZ Tray ainda não estava pronto. Tente clicar em "Atualizar QZ".'
  }
  if (isQzConnectInProgressError(error)) {
    return 'Conexão com QZ Tray em andamento. Aguarde ou clique em "Atualizar QZ".'
  }
  return error instanceof Error
    ? error.message
    : 'Não foi possível conectar ao QZ Tray para listar impressoras.'
}

async function importWithRetry<T>(
  loader: () => Promise<T>,
  options?: { retries?: number; delayMs?: number }
): Promise<T> {
  const retries = options?.retries ?? 2
  const delayMs = options?.delayMs ?? 500
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await loader()
    } catch (error) {
      lastError = error
      if (!isQzChunkLoadError(error) || attempt === retries) break
      await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)))
    }
  }

  throw lastError
}

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
  const qz = (await importWithRetry(() => import('qz-tray'))).default
  await ensureQzTraySecurity(qz)
  return qz
}
