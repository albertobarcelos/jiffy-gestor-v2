import { z } from 'zod'

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato #RRGGBB')

export const deliveryPublicoDesignConfigSchema = z
  .object({
    schemaVersion: z.literal(1),
    layoutId: z.enum(['basico', 'vitrine', 'grade', 'catalogo']),
    cabecalho: z
      .object({
        logoFormato: z.enum(['circular', 'quadrada']),
        nomeExibicao: z.string().max(20).optional(),
        logoUrl: z.string().nullable().optional(),
        capaUrl: z.string().nullable().optional(),
      })
      .strict(),
    cores: z
      .object({
        paletaId: z.enum([
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
        ]),
        personalizadas: z
          .object({
            primary: hexColor,
            primaryDark: hexColor,
            surface: hexColor,
            text: hexColor,
          })
          .strict()
          .optional(),
      })
      .strict()
      .superRefine((cores, ctx) => {
        if (cores.paletaId === 'personalizada' && cores.personalizadas === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'cores.personalizadas é obrigatório quando paletaId é personalizada',
            path: ['personalizadas'],
          })
        }
      }),
    tipografia: z
      .object({
        presetId: z.enum(['urbana', 'moderna', 'classica', 'elegante']),
      })
      .strict(),
    categorias: z
      .object({
        tituloGrupoFundo: z.enum(['cor', 'imagem']),
        corBarraTitulo: hexColor.nullable(),
        corTextoTitulo: hexColor.nullable(),
        mostrarNomeTitulo: z.boolean(),
        mostrarSugestoesDaCasa: z.boolean(),
        sugestoesDaCasaImagemUrl: z.string().nullable().optional(),
      })
      .strict(),
  })
  .strict()

export type DeliveryPublicoDesignConfigDTO = z.infer<typeof deliveryPublicoDesignConfigSchema>

export function createDefaultDeliveryPublicoDesignConfig(
  nomeExibicao = ''
): DeliveryPublicoDesignConfigDTO {
  return deliveryPublicoDesignConfigSchema.parse({
    schemaVersion: 1,
    layoutId: 'basico',
    cabecalho: {
      logoFormato: 'circular',
      ...(nomeExibicao.trim()
        ? { nomeExibicao: nomeExibicao.trim().slice(0, 20) }
        : {}),
    },
    cores: { paletaId: 'carvao' },
    tipografia: { presetId: 'urbana' },
    categorias: {
      tituloGrupoFundo: 'imagem',
      corBarraTitulo: null,
      corTextoTitulo: null,
      mostrarNomeTitulo: true,
      mostrarSugestoesDaCasa: true,
    },
  })
}
