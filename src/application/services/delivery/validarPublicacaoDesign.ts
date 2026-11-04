import type { DeliveryPublicoDesignConfigDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'
import { validarDraftDesign } from '@/src/application/services/delivery/validarDraftDesign'

const LAYOUTS = new Set(['basico', 'vitrine', 'grade', 'catalogo'])
const PALETAS = new Set([
  'carvao',
  'lavanda',
  'mirtilo',
  'pessego',
  'canela',
  'cereja',
  'gergelim',
  'hortela',
  'chocolate',
  'mostarda',
  'personalizada',
])
const TIPOGRAFIAS = new Set(['urbana', 'moderna', 'classica', 'elegante'])

export function validarPublicacaoDesign(input: unknown): DeliveryPublicoDesignConfigDTO {
  const config = validarDraftDesign(input)
  if (!LAYOUTS.has(config.layoutId)) {
    throw new Error('Modelo de layout não pode ser publicado no momento')
  }
  if (!PALETAS.has(config.cores.paletaId)) {
    throw new Error('Paleta não pode ser publicada no momento')
  }
  if (!TIPOGRAFIAS.has(config.tipografia.presetId)) {
    throw new Error('Tipografia não pode ser publicada no momento')
  }
  return config
}
