import { z } from 'zod'

const optionalBoolFromQuery = z
  .enum(['true', 'false'])
  .optional()
  .transform(value => (value === 'true' ? true : value === 'false' ? false : null))

export const ListarMenusQuerySchema = z.object({
  q: z.string().optional(),
  name: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  tipo: z.string().optional(),
  ativo: optionalBoolFromQuery,
})

export const CreateMenuBodySchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório'),
  descricao: z.string().nullable().optional(),
  codigo: z.string().optional(),
})

export const UpdateMenuBodySchema = z.object({
  nome: z.string().trim().min(1).optional(),
  descricao: z.string().nullable().optional(),
  ativo: z.boolean().optional(),
})

export const MenuProdutoTipoFiltroSchema = z.enum(['all', 'padrao', 'pizza']).optional()

export const ListarMenuProdutosQuerySchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  ativo: optionalBoolFromQuery,
  favorito: optionalBoolFromQuery,
  grupoProdutoId: z.string().optional(),
  grupoComplementosId: z.string().optional(),
  tipo: MenuProdutoTipoFiltroSchema,
})

export const UpdateMenuProdutoInputSchema = z.object({
  nome: z.string().optional(),
  descricao: z.string().nullable().optional(),
  valor: z.number().optional(),
  ordem: z.number().int().optional(),
  favorito: z.boolean().optional(),
  ativo: z.boolean().optional(),
  grupoProdutoId: z.string().optional(),
  gruposComplementosIds: z.array(z.string()).optional(),
  imageId: z.string().nullable().optional(),
})

export const UpdateMenuProdutosBatchBodySchema = z.object({
  add: z.array(z.string()).optional(),
  remove: z.array(z.string()).optional(),
  update: z
    .array(z.object({ produtoId: z.string().min(1) }).merge(UpdateMenuProdutoInputSchema))
    .optional(),
})

export const ReorderBodySchema = z.object({
  novaPosicao: z.coerce.number().int().min(1, 'Nova posição inválida'),
})

export const UpdateMenuGrupoBodySchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório'),
})

export const ImageUploadIntentBodySchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeInBytes: z.coerce.number().int().positive(),
})

export const ListarMenuGruposQuerySchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  ativo: optionalBoolFromQuery,
  grupoProdutoId: z.string().optional(),
})

export const MenuRouteIdSchema = z.string().trim().min(1, 'Menu não informado')

export const MenuRouteProdutoIdSchema = z.string().trim().min(1, 'Produto não informado')

export const MenuRouteGrupoProdutoIdSchema = z
  .string()
  .trim()
  .min(1, 'Categoria não informada')

export type ListarMenusQueryInput = z.infer<typeof ListarMenusQuerySchema>
export type CreateMenuBodyInput = z.infer<typeof CreateMenuBodySchema>
export type UpdateMenuBodyInput = z.infer<typeof UpdateMenuBodySchema>
export type ListarMenuProdutosQueryInput = z.infer<typeof ListarMenuProdutosQuerySchema>
export type UpdateMenuProdutosBatchBodyInput = z.infer<typeof UpdateMenuProdutosBatchBodySchema>
export type UpdateMenuProdutoBodyInput = z.infer<typeof UpdateMenuProdutoInputSchema>
export type ListarMenuGruposQueryInput = z.infer<typeof ListarMenuGruposQuerySchema>
