/** Ancestor com overflow de rolagem (ex.: `main` do layout de produtos). */
export function findScrollableAncestor(start: HTMLElement | null): HTMLElement | null {
  let el: HTMLElement | null = start
  while (el) {
    const { overflowY } = window.getComputedStyle(el)
    if (/(auto|scroll|overlay)/.test(overflowY) && el.scrollHeight > el.clientHeight + 1) {
      return el
    }
    el = el.parentElement
  }
  return null
}

/** Texto único para célula sem dado (alinha com o filtro "sem …"). */
export function textoOuNenhum(v: string | null | undefined): string {
  const t = v === null || v === undefined ? '' : String(v).trim()
  return t === '' ? 'Nenhum' : t
}
