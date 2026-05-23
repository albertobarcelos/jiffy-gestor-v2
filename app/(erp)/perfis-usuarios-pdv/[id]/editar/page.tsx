import { NovoPerfilUsuario } from '@/src/presentation/components/features/perfis-usuarios-pdv/NovoPerfilUsuario'

export default async function EditarPerfilUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="h-full">
      <NovoPerfilUsuario perfilId={id} />
    </div>
  )
}

