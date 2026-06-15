import type { IconType } from 'react-icons'
import {
  MdAssessment,
  MdBusiness,
  MdFileDownload,
  MdReceipt,
  MdReceiptLong,
} from 'react-icons/md'
import { Etapa1DadosFiscaisEmpresa } from './Etapa1DadosFiscaisEmpresa'
import { Etapa2EmissorFiscal } from './Etapa2EmissorFiscal'
import { MapearProdutosView } from './MapearProdutosView'
import { Etapa4InutilizarNotas } from './Etapa4InutilizarNotas'
import { ReformaTributariaView } from './ReformaTributariaView'
import { ExportarXmlView } from './ExportarXmlView'
/** URL única do painel — etapas são abas SPA, sem troca de rota. */
export const PORTAL_CONTADOR_PATH = '/portal-contador'

export interface EtapaPainelConfig {
  id: string
  step: number
  title: string
  label: string
  path: string
  component: React.ComponentType
  icon: IconType
}

export const PAINEL_CONTADOR_ETAPAS: EtapaPainelConfig[] = [
  {
    id: 'etapa-1-dados-fiscais',
    step: 1,
    title: 'Configurações Fiscais',
    label: 'Configurações Fiscais',
    path: PORTAL_CONTADOR_PATH,
    component: Etapa1DadosFiscaisEmpresa,
    icon: MdBusiness,
  },
  {
    id: 'etapa-2-emissor-fiscal',
    step: 2,
    title: 'Emissor Fiscal',
    label: 'Emissor Fiscal',
    path: PORTAL_CONTADOR_PATH,
    component: Etapa2EmissorFiscal,
    icon: MdReceipt,
  },
  {
    id: 'etapa-3-cenario-fiscal',
    step: 3,
    title: 'Cenário Fiscal (NCMs)',
    label: 'Cenário Fiscal (NCMs)',
    path: PORTAL_CONTADOR_PATH,
    component: MapearProdutosView,
    icon: MdAssessment,
  },
  {
    id: 'etapa-4-numeracoes-fiscais',
    step: 4,
    title: 'Inutilizar Notas',
    label: 'Inutilizar Notas',
    path: PORTAL_CONTADOR_PATH,
    component: Etapa4InutilizarNotas,
    icon: MdReceiptLong,
  },
  {
    id: 'reforma-tributaria',
    step: 5,
    title: 'Reforma Tributária',
    label: 'Reforma Tributária',
    path: PORTAL_CONTADOR_PATH,
    component: ReformaTributariaView,
    icon: MdAssessment,
  },
  {
    id: 'exportar-xml',
    step: 6,
    title: 'Exportar XMLs',
    label: 'Exportar XMLs',
    path: PORTAL_CONTADOR_PATH,
    component: ExportarXmlView,
    icon: MdFileDownload,
  },
]
