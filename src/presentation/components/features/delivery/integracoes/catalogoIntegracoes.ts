import type { MarketplaceCodigo } from '@/src/domain/integracoes/Marketplace'

export type IntegracaoCatalogoItem = {
  marketplace: MarketplaceCodigo
  nome: string
  descricao: string
  rotuloIdLoja: string
  placeholderIdLoja: string
  cta: string
  ajuda: string
  marca: string
  corMarca: string
}

export const CATALOGO_INTEGRACOES: readonly IntegracaoCatalogoItem[] = [
  {
    marketplace: 'AIQFOME',
    nome: 'Aiqfome',
    descricao: 'Receba pedidos do Aiqfome no Kanban desta empresa.',
    rotuloIdLoja: 'ID da loja no Aiqfome',
    placeholderIdLoja: 'Informado no Geraldo',
    cta: 'Iniciar integração',
    ajuda:
      'Entre no Magalu com o mesmo e-mail do dono da loja no Geraldo. A volta do login não acontece no Gestor.',
    marca: 'aiq',
    corMarca: '#FF4D00',
  },
]
