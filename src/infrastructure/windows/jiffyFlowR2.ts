/**
 * Distribuição do Fredy no R2 (bucket `jiffy-flow`).
 * Contratos e paths. Sem regra de pedido.
 */

export const JIFFY_FLOW_R2_BUCKET = 'jiffy-flow'

/** Host público do bucket `jiffy-flow`. Override: `NEXT_PUBLIC_JIFFY_FLOW_R2_BASE`. */
export const DEFAULT_JIFFY_FLOW_R2_PUBLIC_BASE =
  'https://pub-143026e1401641a5ad59a389410eed2a.r2.dev'

export const JIFFY_FLOW_R2_PATHS = {
  brandLogo: 'brand/logo.png',
  brandIcon: 'brand/icon.png',
  setup: 'stable/FredySetup.exe',
  manifest: 'stable/update-manifest.stable.json',
} as const

export function jiffyFlowReleaseExePath(version: string): string {
  const semver = version.trim()
  return `releases/${semver}/Fredy.exe`
}

export function jiffyFlowR2PublicBase(): string {
  const fromEnv =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_JIFFY_FLOW_R2_BASE?.trim() : ''
  return (fromEnv || DEFAULT_JIFFY_FLOW_R2_PUBLIC_BASE).replace(/\/+$/, '')
}

export function urlObjectoJiffyFlow(path: string): string | null {
  const overrideSetup =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_PEDIDOS_WINDOWS_SETUP_URL?.trim() : ''
  if (path === JIFFY_FLOW_R2_PATHS.setup && overrideSetup) {
    return overrideSetup
  }
  const base = jiffyFlowR2PublicBase()
  if (!base) return null
  return `${base}/${path.replace(/^\/+/, '')}`
}

export function urlInstaladorJiffyFlow(): string | null {
  return urlObjectoJiffyFlow(JIFFY_FLOW_R2_PATHS.setup)
}
