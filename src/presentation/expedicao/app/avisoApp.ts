import { showToast } from '@/src/shared/utils/toast'

const DURACAO_AVISO_APP_MS = 2000

export const avisoApp = {
  success: (message: string) => showToast.success(message, { duration: DURACAO_AVISO_APP_MS }),
  error: (message: string) => showToast.error(message, { duration: DURACAO_AVISO_APP_MS }),
}
