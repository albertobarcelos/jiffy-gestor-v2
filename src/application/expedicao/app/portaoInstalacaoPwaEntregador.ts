export function isDisplayStandalonePwa(input: {
  displayModeStandalone?: boolean
  iosStandalone?: boolean
}): boolean {
  return Boolean(input.displayModeStandalone || input.iosStandalone)
}

export function ehCelularPwaEntregador(userAgent: string | null | undefined): boolean {
  return /Android|iPhone|iPad|iPod/i.test(String(userAgent ?? ''))
}

/** No celular, o login e o app só seguem no ícone (standalone). */
export function deveMostrarPortaoInstalacaoPwa(input: {
  ehCelular: boolean
  standalone: boolean
}): boolean {
  return input.ehCelular && !input.standalone
}
