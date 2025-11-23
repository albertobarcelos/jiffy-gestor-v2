import { NovoGrupo } from '@/src/presentation/components/features/grupos-produtos/NovoGrupo'

export default async function EditarGrupoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <NovoGrupo grupoId={id} />
}

