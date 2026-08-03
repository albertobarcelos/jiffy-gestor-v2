import {
  deliveryPublicoDesignConfigSchema,
  type DeliveryPublicoDesignConfigDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'

/** Espelha o gate do backend (`ValidarPublicacaoDesignDelivery`). UX apenas — BE é fonte da verdade. */
const LAYOUTS_PUBLICAVEIS = new Set(['basico'])

const PALETAS_PUBLICAVEIS = new Set([
  'carvao',
  'lavanda',
  'mirtilo',
  'personalizada',
])

const TIPOGRAFIAS_PUBLICAVEIS = new Set(['urbana'])

const MENSAGEM_NAO_PUBLICAVEL =
  'Somente o modelo Básico, as paletas Carvão, Lavanda, Mirtilo e Personalizada e a tipografia Urbana podem ser publicados no momento'

/**
 * Valida shape Zod + gate de publicação antes do POST /publish.
 */
export function validarPublicacaoDesign(
  input: unknown
):
  | { ok: true; data: DeliveryPublicoDesignConfigDTO }
  | { ok: false; error: string } {
  const parsed = deliveryPublicoDesignConfigSchema.safeParse(input)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return {
      ok: false,
      error: first?.message || 'Dados de design inválidos.',
    }
  }

  const config = parsed.data

  if (!LAYOUTS_PUBLICAVEIS.has(config.layoutId)) {
    return { ok: false, error: MENSAGEM_NAO_PUBLICAVEL }
  }

  if (!PALETAS_PUBLICAVEIS.has(config.cores.paletaId)) {
    return { ok: false, error: MENSAGEM_NAO_PUBLICAVEL }
  }

  if (!TIPOGRAFIAS_PUBLICAVEIS.has(config.tipografia.presetId)) {
    return { ok: false, error: MENSAGEM_NAO_PUBLICAVEL }
  }

  return { ok: true, data: config }
}

export function podePublicarDesign(input: unknown): boolean {
  return validarPublicacaoDesign(input).ok
}
