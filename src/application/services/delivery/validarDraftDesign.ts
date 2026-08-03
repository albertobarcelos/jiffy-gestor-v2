import {
  deliveryPublicoDesignConfigSchema,
  type DeliveryPublicoDesignConfigDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'

/**
 * Valida o body do draft (shape canônico). Layouts/paletas premium são permitidos no draft.
 */
export function validarDraftDesign(
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

  return { ok: true, data: parsed.data }
}
