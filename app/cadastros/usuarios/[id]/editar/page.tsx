import { NovoUsuario } from '@/src/presentation/components/features/usuarios/NovoUsuario'

export default async function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="h-full">
      <NovoUsuario usuarioId={id} />
    </div>
  )
}

