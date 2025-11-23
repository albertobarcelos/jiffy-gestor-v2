import { NovaImpressora } from '@/src/presentation/components/features/impressoras/NovaImpressora'

export default async function EditarImpressoraPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="h-full">
      <NovaImpressora impressoraId={id} />
    </div>
  )
}

