/** URL persistida (http/https); ignora preview blob/data. */
export function urlImagemHttp(url: string | null | undefined): string | null {
  const value = url?.trim()
  if (!value || value.startsWith('blob:') || value.startsWith('data:')) return null
  return value
}
