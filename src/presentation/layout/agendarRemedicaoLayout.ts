/** Reagenda medições depois de fonte, paint e hidratação de controles. */
export function agendarRemedicaoLayout(medir: () => void): () => void {
  const frames: number[] = []
  frames.push(
    window.requestAnimationFrame(() => {
      frames.push(window.requestAnimationFrame(() => medir()))
    })
  )
  const t1 = window.setTimeout(medir, 80)
  const t2 = window.setTimeout(medir, 300)
  void document.fonts?.ready.then(() => medir())
  window.addEventListener('load', medir)

  return () => {
    frames.forEach(id => window.cancelAnimationFrame(id))
    window.clearTimeout(t1)
    window.clearTimeout(t2)
    window.removeEventListener('load', medir)
  }
}
