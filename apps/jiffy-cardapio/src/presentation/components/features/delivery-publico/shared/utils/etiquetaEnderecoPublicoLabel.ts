/** Rótulo de etiqueta de endereço no checkout público. */
export function etiquetaEnderecoPublicoLabel(etiqueta: string): string {
  const e = etiqueta.trim().toLowerCase()
  if (e === 'casa') return 'Casa'
  if (e === 'trabalho') return 'Trabalho'
  if (e === 'outro') return 'Outro'
  if (!e) return ''
  return e.charAt(0).toUpperCase() + e.slice(1)
}
