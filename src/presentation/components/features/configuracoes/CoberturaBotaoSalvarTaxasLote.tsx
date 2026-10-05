'use client'

type CoberturaBotaoSalvarTaxasLoteProps = {
  pendente: boolean
  disabled: boolean
  salvando: boolean
  onClick: () => void
}

/** Footer do painel de cobertura: “Tudo certo” / “Salvar”. */
export function CoberturaBotaoSalvarTaxasLote({
  pendente,
  disabled,
  salvando,
  onClick,
}: CoberturaBotaoSalvarTaxasLoteProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-lg px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed ${
        pendente
          ? 'bg-primary text-white hover:bg-primary/90 disabled:opacity-50'
          : 'bg-gray-200 text-gray-600'
      }`}
    >
      {salvando ? 'Salvando…' : pendente ? 'Salvar' : 'Tudo certo'}
    </button>
  )
}
