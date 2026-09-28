export type EstiloTracejado = {
  thick?: number
  dash?: number
  gap?: number
  padY?: number
}

/** Tracejado entre produtos da via de produção — médio, com folga em cima e embaixo. */
export const TRACEJADO_PRODUCAO: EstiloTracejado = { thick: 4, dash: 12, gap: 6, padY: 10 }
