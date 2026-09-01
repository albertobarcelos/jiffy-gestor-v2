import { z } from 'zod'

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

/** Formulário UI — distância em km, convertida para metros no submit. */
export const raioEntregaFormValidator = z.object({
  nome: z.string().max(255).optional(),
  distanciaKm: z
    .number({ invalid_type_error: 'Informe a distância em km' })
    .positive('Distância deve ser maior que zero')
    .max(500, 'Distância máxima de 500 km'),
  valorTaxa: z
    .number({ invalid_type_error: 'Informe o valor da taxa' })
    .nonnegative('Valor da taxa não pode ser negativo'),
  tempoEntregaInMinutes: z
    .number({ invalid_type_error: 'Informe o tempo de entrega' })
    .int('Tempo deve ser inteiro')
    .nonnegative('Tempo não pode ser negativo'),
  ativo: z.boolean(),
})

export type RaioEntregaFormValues = z.infer<typeof raioEntregaFormValidator>

export function raioEntregaFormToCreateInput(values: RaioEntregaFormValues): CreateRaioEntregaInput {
  const nome = values.nome?.trim()
  return {
    nome: nome ? nome : null,
    distanciaMaximaEmMetros: Math.round(values.distanciaKm * 1000),
    valorTaxa: values.valorTaxa,
    tempoEntregaInMinutes: values.tempoEntregaInMinutes,
    ativo: values.ativo,
  }
}

export function raioEntregaFormToUpdateInput(values: RaioEntregaFormValues): UpdateRaioEntregaInput {
  return raioEntregaFormToCreateInput(values)
}

export function raioEntregaToFormValues(raio: RaioEntregaDTO): RaioEntregaFormValues {
  return {
    nome: raio.nome ?? '',
    distanciaKm: raio.distanciaMaximaEmMetros / 1000,
    valorTaxa: raio.valorTaxa,
    tempoEntregaInMinutes: raio.tempoEntregaInMinutes,
    ativo: raio.ativo,
  }
}

export function formatDistanciaRaio(metros: number): string {
  if (metros >= 1000) {
    const km = metros / 1000
    return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(km)} km`
  }
  return `${metros} m`
}

export function formatValorTaxaRaio(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}
