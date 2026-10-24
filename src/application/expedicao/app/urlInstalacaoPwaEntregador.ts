import { EXPEDICAO_APP_PATH_CURTO } from '@/src/application/expedicao/app/constantesSuperficie'

/** URL que o QR abre: mesmo origin do Gestor + `/e` (PWA). */
export function urlInstalacaoPwaEntregador(origin: string | null | undefined): string {
  const base = String(origin ?? '')
    .trim()
    .replace(/\/$/, '')
  if (!base) return EXPEDICAO_APP_PATH_CURTO
  return `${base}${EXPEDICAO_APP_PATH_CURTO}`
}
