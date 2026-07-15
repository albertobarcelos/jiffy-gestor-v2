export type DeliveryPaisTelefone = {
  iso2: string
  nome: string
  /** Código do país sem o `+`. */
  ddi: string
  nationalMin: number
  nationalMax: number
  /** Máscara brasileira; demais países usam dígitos genéricos. */
  mascara: 'br' | 'generica'
}

/** Países mais usados no delivery BR + vizinhos e fluxos comuns. */
export const DELIVERY_PAISES_TELEFONE: DeliveryPaisTelefone[] = [
  { iso2: 'BR', nome: 'Brasil', ddi: '55', nationalMin: 10, nationalMax: 11, mascara: 'br' },
  { iso2: 'AR', nome: 'Argentina', ddi: '54', nationalMin: 10, nationalMax: 11, mascara: 'generica' },
  { iso2: 'PY', nome: 'Paraguai', ddi: '595', nationalMin: 9, nationalMax: 10, mascara: 'generica' },
  { iso2: 'UY', nome: 'Uruguai', ddi: '598', nationalMin: 8, nationalMax: 9, mascara: 'generica' },
  { iso2: 'CL', nome: 'Chile', ddi: '56', nationalMin: 9, nationalMax: 9, mascara: 'generica' },
  { iso2: 'BO', nome: 'Bolívia', ddi: '591', nationalMin: 8, nationalMax: 9, mascara: 'generica' },
  { iso2: 'PE', nome: 'Peru', ddi: '51', nationalMin: 9, nationalMax: 9, mascara: 'generica' },
  { iso2: 'CO', nome: 'Colômbia', ddi: '57', nationalMin: 10, nationalMax: 10, mascara: 'generica' },
  { iso2: 'VE', nome: 'Venezuela', ddi: '58', nationalMin: 10, nationalMax: 10, mascara: 'generica' },
  { iso2: 'EC', nome: 'Equador', ddi: '593', nationalMin: 9, nationalMax: 9, mascara: 'generica' },
  { iso2: 'MX', nome: 'México', ddi: '52', nationalMin: 10, nationalMax: 10, mascara: 'generica' },
  { iso2: 'US', nome: 'Estados Unidos', ddi: '1', nationalMin: 10, nationalMax: 10, mascara: 'generica' },
  { iso2: 'CA', nome: 'Canadá', ddi: '1', nationalMin: 10, nationalMax: 10, mascara: 'generica' },
  { iso2: 'PT', nome: 'Portugal', ddi: '351', nationalMin: 9, nationalMax: 9, mascara: 'generica' },
  { iso2: 'ES', nome: 'Espanha', ddi: '34', nationalMin: 9, nationalMax: 9, mascara: 'generica' },
  { iso2: 'IT', nome: 'Itália', ddi: '39', nationalMin: 9, nationalMax: 11, mascara: 'generica' },
  { iso2: 'DE', nome: 'Alemanha', ddi: '49', nationalMin: 10, nationalMax: 12, mascara: 'generica' },
  { iso2: 'FR', nome: 'França', ddi: '33', nationalMin: 9, nationalMax: 9, mascara: 'generica' },
  { iso2: 'GB', nome: 'Reino Unido', ddi: '44', nationalMin: 10, nationalMax: 10, mascara: 'generica' },
  { iso2: 'JP', nome: 'Japão', ddi: '81', nationalMin: 10, nationalMax: 11, mascara: 'generica' },
  { iso2: 'CN', nome: 'China', ddi: '86', nationalMin: 11, nationalMax: 11, mascara: 'generica' },
  { iso2: 'AO', nome: 'Angola', ddi: '244', nationalMin: 9, nationalMax: 9, mascara: 'generica' },
  { iso2: 'CV', nome: 'Cabo Verde', ddi: '238', nationalMin: 7, nationalMax: 7, mascara: 'generica' },
  { iso2: 'MZ', nome: 'Moçambique', ddi: '258', nationalMin: 9, nationalMax: 9, mascara: 'generica' },
]

export const DELIVERY_PAIS_TELEFONE_PADRAO = 'BR'

export function findDeliveryPaisTelefone(iso2: string): DeliveryPaisTelefone {
  const found = DELIVERY_PAISES_TELEFONE.find(
    pais => pais.iso2.toUpperCase() === iso2.trim().toUpperCase()
  )
  return found ?? DELIVERY_PAISES_TELEFONE[0]!
}

/** URL da miniatura da bandeira (flagcdn). */
export function deliveryPaisFlagUrl(iso2: string, width = 40): string {
  return `https://flagcdn.com/w${width}/${iso2.trim().toLowerCase()}.png`
}

export function deliveryPaisFlagSrcSet(iso2: string): string {
  const code = iso2.trim().toLowerCase()
  return `https://flagcdn.com/w40/${code}.png 1x, https://flagcdn.com/w80/${code}.png 2x`
}
