import { empresaNomeParaSlugUrl } from '@/src/shared/utils/empresaNomeParaSlugUrl'

/**
 * Nome do ZIP: XMLs_{PrimeiroNomeEmpresa}_{periodo}.zip
 * Ex.: "Nexsyn Ltda" + 2026-05 → XMLs_Nexsyn_2026-05.zip
 */
export function buildExportacaoXmlFilename(nomeEmpresa: string, periodo: string): string {
  const slug = empresaNomeParaSlugUrl(nomeEmpresa)
  const nome = slug.charAt(0).toUpperCase() + slug.slice(1)
  const periodoLimpo = periodo.replace(/[^\d\-_]/g, '')
  return `XMLs_${nome}_${periodoLimpo}.zip`
}

export function periodoExportacaoXml(input: {
  mes?: string
  dataInicial?: string
  dataFinal?: string
}): string {
  if (input.mes) return input.mes
  if (input.dataInicial && input.dataFinal) {
    return `${input.dataInicial}_${input.dataFinal}`
  }
  return 'periodo'
}
