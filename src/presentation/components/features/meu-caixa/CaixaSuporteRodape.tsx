'use client'

export function CaixaSuporteRodape({
  estacaoId,
  estacaoNome,
}: {
  estacaoId: string | null
  estacaoNome: string | null
}) {
  if (!estacaoId) return null

  const rotulo = estacaoNome?.trim() || 'Estação vinculada'

  return (
    <div className="shrink-0 border-t border-gray-100 bg-[#f9fafb] px-4 py-2">
      <p
        className="truncate text-[10px] leading-tight text-gray-400"
        title={`${rotulo} · ${estacaoId}`}
      >
        Suporte: {rotulo} · {estacaoId}
      </p>
    </div>
  )
}
