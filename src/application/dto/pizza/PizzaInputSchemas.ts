import { z } from 'zod'

export const regraPrecoMultiplosSaboresSchema = z.enum(['proporcional', 'maior'])

export const tipoImpactoPrecoSchema = z.enum(['nenhum', 'aumenta', 'diminui'])

const massaInputSchema = z.object({
  nome: z.string().min(1, 'Nome da massa é obrigatório'),
  descricao: z.string().nullable().optional(),
  valor: z.number(),
  tipoImpactoPreco: tipoImpactoPrecoSchema.optional(),
  ativo: z.boolean().optional(),
})

const bordaInputSchema = z.object({
  nome: z.string().min(1, 'Nome da borda é obrigatório'),
  descricao: z.string().nullable().optional(),
  valor: z.number(),
  tipoImpactoPreco: tipoImpactoPrecoSchema.optional(),
  ativo: z.boolean().optional(),
})

const tamanhoNestedSchema = z.object({
  nome: z.string().min(1, 'Nome do tamanho é obrigatório'),
  quantidadePedacos: z.number().int().positive(),
  quantidadeMaximaDivisoes: z.number().int().positive(),
  ativo: z.boolean().optional(),
})

const saborNestedSchema = z.object({
  nome: z.string().min(1),
  descricao: z.string().nullable().optional(),
  imagemUrl: z.string().url().nullable().optional(),
  ativo: z.boolean().optional(),
  precosTamanho: z
    .array(
      z.object({
        nome: z.string().min(1),
        precoCheio: z.number().min(0),
      })
    )
    .optional(),
})

export const createCategoriaPizzaSchema = z.object({
  nome: z.string().min(1, 'Nome da categoria é obrigatório'),
  ativo: z.boolean().nullable().optional(),
  imagemUrl: z.string().url().nullable().optional(),
  corHex: z.string().optional(),
  iconName: z.string().optional(),
})

export const createCategoriaPizzaCompletoSchema = createCategoriaPizzaSchema.extend({
  config: z
    .object({
      menuId: z.string().min(1).nullable().optional(),
      regraPrecoMultiplosSabores: regraPrecoMultiplosSaboresSchema.optional(),
      imprimir: z.boolean().optional(),
      permiteDesconto: z.boolean().optional(),
      permiteAcrescimo: z.boolean().optional(),
      ativo: z.boolean().optional(),
    })
    .optional(),
  tamanhos: z.array(tamanhoNestedSchema).optional(),
  sabores: z.array(saborNestedSchema).optional(),
  gruposBordas: z
    .array(
      z.object({
        nome: z.string().min(1),
        bordas: z.array(bordaInputSchema).min(1),
        obrigatorio: z.boolean().optional(),
        qtdMinima: z.number().int().optional(),
        qtdMaxima: z.number().int().optional(),
        ordem: z.number().int().optional(),
        ativo: z.boolean().optional(),
      })
    )
    .optional(),
  gruposMassas: z
    .array(
      z.object({
        nome: z.string().min(1),
        massas: z.array(massaInputSchema).min(1),
        obrigatorio: z.boolean().optional(),
        qtdMinima: z.number().int().optional(),
        qtdMaxima: z.number().int().optional(),
        ordem: z.number().int().optional(),
        ativo: z.boolean().optional(),
      })
    )
    .optional(),
})

export const updateCategoriaPizzaSchema = z
  .object({
    nome: z.string().min(1).optional(),
    ativo: z.boolean().nullable().optional(),
    imagemUrl: z.string().url().nullable().optional(),
    corHex: z.string().optional(),
    iconName: z.string().optional(),
  })
  .strict()

export const reorderCategoriaPizzaSchema = z.object({
  novaPosicao: z.number().int().positive(),
})

export const createSaborPizzaSchema = z.object({
  nome: z.string().min(1, 'Nome do sabor é obrigatório'),
  descricao: z.string().nullable().optional(),
  imagemUrl: z.string().url().nullable().optional(),
  ativo: z.boolean().optional(),
  categoriaPizzaId: z.string().min(1),
  precosTamanho: z
    .array(
      z.object({
        pizzaTamanhoId: z.string().min(1),
        precoCheio: z.number().min(0),
      })
    )
    .optional(),
})

export const updateSaborPizzaSchema = z
  .object({
    nome: z.string().min(1).optional(),
    descricao: z.string().nullable().optional(),
    imagemUrl: z.string().url().nullable().optional(),
    ativo: z.boolean().optional(),
    precosTamanho: z
      .array(
        z.object({
          pizzaTamanhoId: z.string().min(1),
          precoCheio: z.number().min(0),
        })
      )
      .optional(),
  })
  .strict()

export const reorderSaborPizzaSchema = z.object({
  novaPosicao: z.number().int().positive(),
})

export const createPizzaTamanhoSchema = z.object({
  grupoPizzaConfigId: z.string().min(1),
  nome: z.string().min(1),
  quantidadePedacos: z.number().int().positive(),
  quantidadeMaximaDivisoes: z.number().int().positive(),
  ativo: z.boolean().optional(),
})

export const updatePizzaTamanhoSchema = z
  .object({
    nome: z.string().min(1).optional(),
    quantidadePedacos: z.number().int().positive().optional(),
    quantidadeMaximaDivisoes: z.number().int().positive().optional(),
    ativo: z.boolean().optional(),
  })
  .strict()
