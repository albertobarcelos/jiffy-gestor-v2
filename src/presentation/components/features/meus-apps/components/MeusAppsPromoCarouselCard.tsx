'use client'

import {
  GradientCarouselCard,
  GRADIENT_CAROUSEL_GRADIENTS,
  type GradientCarouselSlide,
} from '@/src/presentation/components/ui/GradientCarouselCard'

/** Slides locais (placeholder); depois pode vir de CMS/API). */
const SLIDES: GradientCarouselSlide[] = [
  {
    id: '1',
    titulo: 'Tudo em um só lugar',
    gradientClassName: GRADIENT_CAROUSEL_GRADIENTS[0],
    content: (
      <p className="line-clamp-5 text-center text-[11px] leading-relaxed text-white/95 sm:text-xs">
        Organize vendas, financeiro e cadastros sem ficar alternando entre vários sistemas. Veja
        indicadores e rotinas no mesmo painel e decida com informação sempre atualizada.
      </p>
    ),
  },
  {
    id: '2',
    titulo: 'Aprenda com quem entende',
    gradientClassName: GRADIENT_CAROUSEL_GRADIENTS[1],
    content: (
      <p className="line-clamp-5 text-center text-[11px] leading-relaxed text-white/95 sm:text-xs">
        Use tutoriais, treinamentos e o suporte quando precisar. Tire dúvidas e evolua sua operação
        no seu ritmo, sem depender só de tentativa e erro.
      </p>
    ),
  },
  {
    id: '3',
    titulo: 'Conecte todo o fluxo',
    gradientClassName: GRADIENT_CAROUSEL_GRADIENTS[2],
    content: (
      <p className="line-clamp-5 text-center text-[11px] leading-relaxed text-white/95 sm:text-xs">
        Integre PDV, delivery, emissão fiscal e outros pontos do dia a dia. Menos digitação
        duplicada, menos erro manual e mais tempo para atender bem o cliente.
      </p>
    ),
  },
].map(slide => ({ ...slide, badge: 'Destaque' }))

/**
 * Card promocional no grid “Meus aplicativos”: mesma altura dos cards de empresa/convite (`h-52`).
 */
export function MeusAppsPromoCarouselCard({ className }: { className?: string }) {
  return (
    <GradientCarouselCard
      slides={SLIDES}
      className={className}
      heightClassName="h-52"
      ariaLabel="Destaques e ofertas"
    />
  )
}
