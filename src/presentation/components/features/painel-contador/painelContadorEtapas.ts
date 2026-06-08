import type { IconType } from 'react-icons'
import {
  MdAssessment,
  MdBusiness,
  MdKey,
  MdReceipt,
  MdReceiptLong,
} from 'react-icons/md'
import { Etapa1DadosFiscaisEmpresa } from './Etapa1DadosFiscaisEmpresa'
import { Etapa2EmissorFiscal } from './Etapa2EmissorFiscal'
import { MapearProdutosView } from './MapearProdutosView'
import { Etapa4InutilizarNotas } from './Etapa4InutilizarNotas'
import { Etapa5ChaveIbpt } from './Etapa5ChaveIbpt'
import { ReformaTributariaView } from './ReformaTributariaView'
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
    title: 'Dados Fiscais e Certificado Digital',
    label: 'Dados Fiscais e Certificado Digital',
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
    id: 'etapa-5-chave-ibpt',
    step: 5,
    title: 'Chave IBPT',
    label: 'Chave IBPT',
    path: PORTAL_CONTADOR_PATH,
    component: Etapa5ChaveIbpt,
    icon: MdKey,
  },
  {
    id: 'reforma-tributaria',
    step: 6,
    title: 'Reforma Tributária',
    label: 'Reforma Tributária',
    path: PORTAL_CONTADOR_PATH,
    component: ReformaTributariaView,
    icon: MdAssessment,
  },
]
