import { z } from 'zod'
import {
  geoJsonPolygonLikeValidator,
  type GeoJsonPolygon,
  type GeoJsonPolygonLike,
} from '@/src/shared/types/geoJsonPolygon'

export { type GeoJsonPolygon, type GeoJsonPolygonLike }

export const areaEntregaDTOValidator = z.object({
  id: z.string(),
  nome: z.string().nullable(),
  area: geoJsonPolygonLikeValidator,
  valorTaxa: z.number().nonnegative(),
  tempoEntregaInMinutes: z.number().int().nonnegative(),
  ativo: z.boolean(),
  dataCriacao: z.string(),
  dataAtualizacao: z.string(),
})

export type AreaEntregaDTO = z.infer<typeof areaEntregaDTOValidator>

export const createAreaEntregaInputValidator = z.object({
  nome: z.string().max(255).nullable().optional(),
  area: geoJsonPolygonLikeValidator,
  valorTaxa: z.number().nonnegative('Valor da taxa não pode ser negativo'),
  tempoEntregaInMinutes: z
    .number()
    .int('Tempo de entrega deve ser um número inteiro')
    .nonnegative('Tempo de entrega não pode ser negativo'),
  ativo: z.boolean().optional(),
})

export type CreateAreaEntregaInput = z.infer<typeof createAreaEntregaInputValidator>

export const updateAreaEntregaInputValidator = z
  .object({
    nome: z.string().max(255).nullable().optional(),
    area: geoJsonPolygonLikeValidator.optional(),
    valorTaxa: z.number().nonnegative().optional(),
    tempoEntregaInMinutes: z.number().int().nonnegative().optional(),
    ativo: z.boolean().optional(),
  })
  .refine(
    data =>
      data.nome !== undefined ||
      data.area !== undefined ||
      data.valorTaxa !== undefined ||
      data.tempoEntregaInMinutes !== undefined ||
      data.ativo !== undefined,
    { message: 'Informe ao menos um campo para atualizar' }
  )

export type UpdateAreaEntregaInput = z.infer<typeof updateAreaEntregaInputValidator>

export const areaEntregaFormValidator = z.object({
  nome: z
    .string({ invalid_type_error: 'Informe o nome da área' })
    .trim()
    .min(1, 'Informe o nome da área')
    .max(255),
  valorTaxa: z
    .number({ invalid_type_error: 'Informe o valor da taxa' })
    .nonnegative('Valor da taxa não pode ser negativo'),
  tempoEntregaInMinutes: z
    .number({ invalid_type_error: 'Informe o tempo de entrega' })
    .int('Tempo deve ser inteiro')
    .nonnegative('Tempo não pode ser negativo'),
  ativo: z.boolean(),
})

export type AreaEntregaFormValues = z.infer<typeof areaEntregaFormValidator>

export function areaEntregaFormToCreateInput(
  values: AreaEntregaFormValues,
  area: GeoJsonPolygonLike
): CreateAreaEntregaInput {
  const nome = values.nome.trim()
  return {
    nome,
    area,
    valorTaxa: values.valorTaxa,
    tempoEntregaInMinutes: values.tempoEntregaInMinutes,
    ativo: values.ativo,
  }
}

export function areaEntregaFormToUpdateInput(values: AreaEntregaFormValues): UpdateAreaEntregaInput {
  const nome = values.nome.trim()
  return {
    nome,
    valorTaxa: values.valorTaxa,
    tempoEntregaInMinutes: values.tempoEntregaInMinutes,
    ativo: values.ativo,
  }
}

export function areaEntregaToFormValues(area: AreaEntregaDTO): AreaEntregaFormValues {
  return {
    nome: area.nome ?? '',
    valorTaxa: area.valorTaxa,
    tempoEntregaInMinutes: area.tempoEntregaInMinutes,
    ativo: area.ativo,
  }
}

export const raioEntregaDTOValidator = z.object({
  id: z.string(),
  nome: z.string().nullable(),
  distanciaMaximaEmMetros: z.number().int().positive(),
  valorTaxa: z.number().nonnegative(),
  tempoEntregaInMinutes: z.number().int().nonnegative(),
  ativo: z.boolean(),
  dataCriacao: z.string(),
  dataAtualizacao: z.string(),
})

export type RaioEntregaDTO = z.infer<typeof raioEntregaDTOValidator>

export const createRaioEntregaInputValidator = z.object({
  nome: z.string().max(255).nullable().optional(),
  distanciaMaximaEmMetros: z
    .number()
    .int('Distância máxima deve ser um número inteiro')
    .positive('Distância máxima deve ser maior que zero'),
  valorTaxa: z.number().nonnegative('Valor da taxa não pode ser negativo'),
  tempoEntregaInMinutes: z
    .number()
    .int('Tempo de entrega deve ser um número inteiro')
    .nonnegative('Tempo de entrega não pode ser negativo'),
  ativo: z.boolean().optional(),
})

export type CreateRaioEntregaInput = z.infer<typeof createRaioEntregaInputValidator>

export const updateRaioEntregaInputValidator = z
  .object({
    nome: z.string().max(255).nullable().optional(),
    distanciaMaximaEmMetros: z.number().int().positive().optional(),
    valorTaxa: z.number().nonnegative().optional(),
    tempoEntregaInMinutes: z.number().int().nonnegative().optional(),
    ativo: z.boolean().optional(),
  })
  .refine(
    data =>
      data.nome !== undefined ||
      data.distanciaMaximaEmMetros !== undefined ||
      data.valorTaxa !== undefined ||
      data.tempoEntregaInMinutes !== undefined ||
      data.ativo !== undefined,
    { message: 'Informe ao menos um campo para atualizar' }
  )

export type UpdateRaioEntregaInput = z.infer<typeof updateRaioEntregaInputValidator>

export const METROS_POR_KM_RAIO = 1000
export const DISTANCIA_MAXIMA_KM_RAIO = 500

export function kmParaMetrosRaio(km: number): number {
  return Math.round(km * METROS_POR_KM_RAIO)
}

export function metrosParaKmRaio(metros: number): number {
  return metros / METROS_POR_KM_RAIO
}

export function formatDistanciaRaio(metros: number): string {
  const km = metrosParaKmRaio(metros)
  const formatado = new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: Number.isInteger(km) ? 0 : 2,
  }).format(km)
  return `${formatado} km`
}

export function formatAlcanceAteKm(metros: number): string {
  return `Até ${formatDistanciaRaio(metros)}`
}

export function alcanceKmDaCobertura(
  raios: Array<Pick<RaioEntregaDTO, 'distanciaMaximaEmMetros'>>
): number {
  if (raios.length === 0) return 0
  const maxMetros = Math.max(...raios.map(raio => raio.distanciaMaximaEmMetros))
  return Math.ceil(metrosParaKmRaio(maxMetros))
}

export function formatValorTaxaRaio(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}
