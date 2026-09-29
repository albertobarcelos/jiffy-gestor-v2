export const HUB_BASE_URL_PRODUCAO = 'https://hub.jiffy.run'
export const HUB_BASE_URL_HOMOLOG = 'https://hub.homolog.jiffy.run'

export type HubMarketplaceConfig = {
  baseUrl: string
  webhookSecret: string
}

function semBarraFinal(url: string): string {
  return url.replace(/\/+$/, '')
}

export function lerHubBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const explicito = env.HUB_BASE_URL?.trim()
  if (explicito) return semBarraFinal(explicito)
  if (env.VERCEL_ENV === 'production') return HUB_BASE_URL_PRODUCAO
  return HUB_BASE_URL_HOMOLOG
}

export function lerHubWebhookSecret(env: NodeJS.ProcessEnv = process.env): string | null {
  const secret = env.HUB_WEBHOOK_SECRET?.trim() || env.WEBHOOK_SECRET?.trim()
  return secret || null
}

export function lerHubMarketplaceConfig(
  env: NodeJS.ProcessEnv = process.env
): HubMarketplaceConfig | null {
  const webhookSecret = lerHubWebhookSecret(env)
  if (!webhookSecret) return null
  return {
    baseUrl: lerHubBaseUrl(env),
    webhookSecret,
  }
}
