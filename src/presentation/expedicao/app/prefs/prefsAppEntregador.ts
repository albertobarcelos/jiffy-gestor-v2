export type NavegadorAppEntregador = 'waze' | 'google'

export type PrefsAppEntregador = {
  avisosPedidoNovo: boolean
  navegador: NavegadorAppEntregador
}

const KEY = 'jiffy-expedicao-app-prefs'
const PADRAO: PrefsAppEntregador = {
  avisosPedidoNovo: true,
  navegador: 'waze',
}

export function lerPrefsAppEntregador(): PrefsAppEntregador {
  if (typeof window === 'undefined') return PADRAO
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return PADRAO
    const parsed = JSON.parse(raw) as Partial<PrefsAppEntregador>
    return {
      avisosPedidoNovo: parsed.avisosPedidoNovo !== false,
      navegador: parsed.navegador === 'google' ? 'google' : 'waze',
    }
  } catch {
    return PADRAO
  }
}

export function gravarPrefsAppEntregador(prefs: PrefsAppEntregador): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(prefs))
  } catch {
    /* ignore */
  }
}
