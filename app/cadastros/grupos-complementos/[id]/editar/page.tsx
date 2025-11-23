import { NovoGrupoComplemento } from '@/src/presentation/components/features/grupos-complementos/NovoGrupoComplemento'

export default async function EditarGrupoComplementoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="h-full">
      <NovoGrupoComplemento grupoId={id} />
    </div>
  )
}

