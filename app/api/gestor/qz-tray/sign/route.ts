import { readFileSync } from 'fs'
import { createSign } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'

function resolveOpenSslSignAlgorithm(algo: string): string {
  const a = algo.toUpperCase()
  if (a === 'SHA1') return 'RSA-SHA1'
  if (a === 'SHA256') return 'RSA-SHA256'
  return 'RSA-SHA512'
}

function loadPrivateKeyPem(): string | null {
  const raw = process.env.QZ_TRAY_PRIVATE_KEY?.replace(/\\n/g, '\n').trim()
  if (raw) return raw
  const path = process.env.QZ_TRAY_PRIVATE_KEY_PATH?.trim()
  if (!path) return null
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return null
  }
}

/**
 * Assina o payload bruto enviado pelo conector QZ (text/plain), no algoritmo alinhado ao `qz.security`.
 */
export async function POST(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const privateKey = loadPrivateKeyPem()
    if (!privateKey) {
      return NextResponse.json(
        { error: 'QZ_TRAY_PRIVATE_KEY ou QZ_TRAY_PRIVATE_KEY_PATH não configurados no servidor.' },
        { status: 503 }
      )
    }

    const message = await request.text()
    if (!message) {
      return NextResponse.json({ error: 'Corpo vazio' }, { status: 400 })
    }

    const algo =
      process.env.QZ_TRAY_SIGN_ALGORITHM?.toUpperCase() ||
      process.env.NEXT_PUBLIC_QZ_TRAY_SIGN_ALGORITHM?.toUpperCase() ||
      'SHA512'
    const openssl = resolveOpenSslSignAlgorithm(algo)

    const signer = createSign(openssl)
    signer.update(message)
    signer.end()
    const signature = signer.sign(privateKey, 'base64')

    return new NextResponse(signature, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=UTF-8' },
    })
  } catch (error) {
    console.error('[qz-tray/sign]', error)
    return NextResponse.json({ error: 'Falha ao assinar' }, { status: 500 })
  }
}
