/** Rótulo exibido no painel conforme código CRT (1/2/3). */
export function formatarRegimeTributario(
  codigo: number | string | null | undefined
): string {
  const n =
    typeof codigo === 'string' ? parseInt(codigo, 10) : typeof codigo === 'number' ? codigo : null
  if (n === 1 || n === 2) return 'Simples Nacional'
  if (n === 3) return 'Regime Normal'
  return 'Não informado'
}
