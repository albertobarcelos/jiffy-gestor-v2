export const PWA_ICON_SIZES = [180, 192, 512] as const

export type PwaIconSize = (typeof PWA_ICON_SIZES)[number]

export function parsePwaIconSize(raw: string | null): PwaIconSize {
  const n = Number(raw)
  if (n === 180 || n === 192 || n === 512) return n
  return 192
}
