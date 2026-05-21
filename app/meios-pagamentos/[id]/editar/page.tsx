import { NovoMeioPagamento } from '@/src/presentation/components/features/meios-pagamentos/NovoMeioPagamento'

export default async function EditarMeioPagamentoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="h-full">
      <NovoMeioPagamento meioPagamentoId={id} />
    </div>
  )
}

