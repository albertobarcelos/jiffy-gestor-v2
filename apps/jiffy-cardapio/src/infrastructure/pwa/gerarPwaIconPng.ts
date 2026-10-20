import { readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { carregarEmpresaPublicaSeo } from '@/src/infrastructure/seo/carregarEmpresaPublicaSeo'
import type { PwaIconSize } from '@/src/infrastructure/pwa/pwaIconSizes'

const FALLBACK_RELATIVE = path.join('public', 'images', 'jiffy-favicon.png')

async function lerFallbackJiffy(): Promise<Buffer> {
  return readFile(path.join(process.cwd(), FALLBACK_RELATIVE))
}

async function baixarLogo(logoUrl: string): Promise<Buffer | null> {
  try {
    const res = await fetch(logoUrl, {
      headers: { Accept: 'image/*' },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const ab = await res.arrayBuffer()
    if (ab.byteLength === 0 || ab.byteLength > 8_000_000) return null
    return Buffer.from(ab)
  } catch {
    return null
  }
}

/** Quadrado PNG (contain + fundo branco) para ícones PWA / apple-touch. */
export async function gerarPwaIconPng(slug: string, size: PwaIconSize): Promise<Buffer> {
  const empresa = await carregarEmpresaPublicaSeo(slug)
  const logoUrl = empresa?.logoUrl?.trim() || null

  let source = await lerFallbackJiffy()
  if (logoUrl) {
    const remoto = await baixarLogo(logoUrl)
    if (remoto) source = remoto
  }

  return sharp(source)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toBuffer()
}
