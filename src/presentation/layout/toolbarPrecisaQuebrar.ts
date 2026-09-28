export const TOOLBAR_GAP_PX = 6
export const TOOLBAR_TOLERANCIA_PX = 24

type ToolbarPrecisaQuebrarInput = {
  disponivel: number
  larguraFiltros: number
  larguraAcoesCima: number
  larguraAcoesBaixo: number
  jaQuebrou: boolean
  scrollWidth: number
  clientWidth: number
  gap?: number
  tolerancia?: number
}

/** Decide se a toolbar do kanban deve usar o layout empilhado à direita. */
export function toolbarPrecisaQuebrar(input: ToolbarPrecisaQuebrarInput): boolean {
  if (input.disponivel <= 0) {
    return true
  }

  const gap = input.gap ?? TOOLBAR_GAP_PX
  const tolerancia = input.tolerancia ?? TOOLBAR_TOLERANCIA_PX
  const precisa =
    input.larguraFiltros + input.larguraAcoesCima + input.larguraAcoesBaixo + gap * 2

  if (input.jaQuebrou) {
    return precisa > input.disponivel + tolerancia
  }

  return input.scrollWidth > input.clientWidth + tolerancia
}
