import { z } from 'zod'

/** Hex CSS #RRGGBB — espelha o backend. */
export const designHexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato #RRGGBB')

export const deliveryLayoutIdSchema = z.enum([
  'basico',
  'vitrine',
  'grade',
  'catalogo',
])

export const deliveryLogoFormatoSchema = z.enum(['circular', 'quadrada'])

export const colorPaletteIdSchema = z.enum([
  'pessego',
  'canela',
  'cereja',
  'gergelim',
  'mirtilo',
  'lavanda',
  'hortela',
  'chocolate',
  'mostarda',
  'carvao',
  'personalizada',
])

export const typographyPresetIdSchema = z.enum([
  'urbana',
  'moderna',
  'classica',
  'elegante',
])

export const grupoTituloFundoModeSchema = z.enum(['cor', 'imagem'])

export const designCustomColorsSchema = z
  .object({
    primary: designHexColorSchema,
    primaryDark: designHexColorSchema,
    surface: designHexColorSchema,
    text: designHexColorSchema,
  })
  .strict()

/**
 * Config canônico da API (draft/published).
 * `schemaVersion` e `logoFormato` são obrigatórios; nome/URLs são espelhos opcionais.
 */
export const deliveryPublicoDesignConfigSchema = z
  .object({
    schemaVersion: z.literal(1),
    layoutId: deliveryLayoutIdSchema,
    cabecalho: z
      .object({
        logoFormato: deliveryLogoFormatoSchema,
        nomeExibicao: z.string().max(20).optional(),
        logoUrl: z.string().nullable().optional(),
        capaUrl: z.string().nullable().optional(),
      })
      .strict(),
    cores: z
      .object({
        paletaId: colorPaletteIdSchema,
        personalizadas: designCustomColorsSchema.optional(),
      })
      .strict()
      .superRefine((cores, ctx) => {
        if (cores.paletaId === 'personalizada' && cores.personalizadas === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'cores.personalizadas é obrigatório quando paletaId é personalizada',
            path: ['personalizadas'],
          })
        }
      }),
    tipografia: z
      .object({
        presetId: typographyPresetIdSchema,
      })
      .strict(),
    categorias: z
      .object({
        tituloGrupoFundo: grupoTituloFundoModeSchema,
        corBarraTitulo: designHexColorSchema.nullable(),
        corTextoTitulo: designHexColorSchema.nullable(),
        mostrarNomeTitulo: z.boolean(),
        mostrarSugestoesDaCasa: z.boolean(),
        sugestoesDaCasaImagemUrl: z.string().nullable().optional(),
      })
      .strict(),
  })
  .strict()

export const updateDeliveryPublicoDesignDraftSchema =
  deliveryPublicoDesignConfigSchema

export const deliveryPublicoDesignMeResponseSchema = z
  .object({
    draft: deliveryPublicoDesignConfigSchema,
    published: deliveryPublicoDesignConfigSchema,
    publishedAt: z.string().datetime().nullable(),
    schemaVersion: z.number().int().positive(),
  })
  .strict()

export type DeliveryPublicoDesignConfigDTO = z.infer<
  typeof deliveryPublicoDesignConfigSchema
>

export type UpdateDeliveryPublicoDesignDraftInput = DeliveryPublicoDesignConfigDTO

export type DeliveryPublicoDesignMeResponseDTO = z.infer<
  typeof deliveryPublicoDesignMeResponseSchema
>

export const CABECALHO_NOME_MAX_LENGTH = 20

/** Defaults alinhados ao backend (`createDefaultEmpresaDeliveryDesignConfig`). */
export function createDefaultDeliveryPublicoDesignConfig(
  nomeExibicao = ''
): DeliveryPublicoDesignConfigDTO {
  return {
    schemaVersion: 1,
    layoutId: 'basico',
    cabecalho: {
      logoFormato: 'circular',
      ...(nomeExibicao
        ? { nomeExibicao: nomeExibicao.slice(0, CABECALHO_NOME_MAX_LENGTH) }
        : {}),
      logoUrl: null,
      capaUrl: null,
    },
    cores: {
      paletaId: 'carvao',
    },
    tipografia: {
      presetId: 'urbana',
    },
    categorias: {
      tituloGrupoFundo: 'imagem',
      corBarraTitulo: null,
      corTextoTitulo: null,
      mostrarNomeTitulo: true,
      mostrarSugestoesDaCasa: true,
      sugestoesDaCasaImagemUrl: null,
    },
  }
}
