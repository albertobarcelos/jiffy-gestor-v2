import { DetalhesCaixaView } from '@/src/presentation/components/features/meu-caixa/DetalhesCaixaView'

interface DetalhesCaixaPageProps {
  params: Promise<{ caixaRef: string }>
  searchParams: Promise<{ conferenciaCaixaRef?: string }>
}

export default async function DetalhesCaixaPage({
  params,
  searchParams,
}: DetalhesCaixaPageProps) {
  const { caixaRef } = await params
  const { conferenciaCaixaRef } = await searchParams

  return (
    <div className="h-full">
      <DetalhesCaixaView
        caixaRef={caixaRef}
        conferenciaCaixaRef={conferenciaCaixaRef}
      />
    </div>
  )
}

