import { NovoComplemento } from '@/src/presentation/components/features/complementos/NovoComplemento'

export default async function EditarComplementoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="h-full">
      <NovoComplemento complementoId={id} />
    </div>
  )
}

