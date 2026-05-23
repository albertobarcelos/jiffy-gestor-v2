import { NovoGrupoComplemento } from '@/src/presentation/components/features/grupos-complementos/NovoGrupoComplemento'

export default async function EditarGrupoComplementoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 shrink-0 bg-primary-bg px-4 py-4 shadow-md md:rounded-tl-[30px] md:px-[30px]">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/25 text-primary">
            <span className="text-2xl">👤</span>
          </div>
          <h1 className="font-exo text-lg font-semibold text-primary">Editar Grupo de Complementos</h1>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <NovoGrupoComplemento grupoId={id} />
      </div>
    </div>
  )
}
