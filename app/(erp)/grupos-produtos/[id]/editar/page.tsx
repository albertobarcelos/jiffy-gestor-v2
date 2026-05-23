import { NovoGrupoModalShell } from '@/src/presentation/components/features/grupos-produtos/NovoGrupoModalShell'

export default async function EditarGrupoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <NovoGrupoModalShell grupoId={id} />
}
