'use client'

type Props = {
  transferencias: string[]
}

export function DetalhesVendaTransferenciasSection({ transferencias }: Props) {
  if (transferencias.length === 0) return null

  return (
                <div className="mb-2 p-2">
                  <h2 className="text-lg font-semibold text-primary-text">Transferências</h2>
                  <div className="mb-2 border-t border-dashed border-gray-400" />
                  <div className="space-y-1 md:px-2">
                    {transferencias.map((linha, index) => (
                      <div
                        key={`${linha}-${index}`}
                        className="rounded-lg bg-white px-1 text-xs text-primary-text md:text-sm"
                      >
                        {linha}
                      </div>
                    ))}
                  </div>
                </div>
  )
}
