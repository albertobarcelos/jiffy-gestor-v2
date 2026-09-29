/** Instalador estável no R2 (nome fixo; substituir o ficheiro a cada versão). */
export const DEFAULT_JIFFY_PRINT_SETUP_URL =
  'https://pub-f30dc155e8504591ac42219788281ee9.r2.dev/JiffyPrint-setup.exe'

export function urlInstaladorJiffyPrint(): string {
  const fromEnv =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_JIFFY_PRINT_SETUP_URL?.trim() : ''
  return fromEnv || DEFAULT_JIFFY_PRINT_SETUP_URL
}

/** Nome do ficheiro que o operador deve procurar na pasta Downloads. */
export function nomeFicheiroInstaladorJiffyPrint(): string {
  try {
    const ultimo = new URL(urlInstaladorJiffyPrint()).pathname.split('/').pop()
    return ultimo && ultimo.toLowerCase().endsWith('.exe') ? ultimo : 'JiffyPrint-setup.exe'
  } catch {
    return 'JiffyPrint-setup.exe'
  }
}
