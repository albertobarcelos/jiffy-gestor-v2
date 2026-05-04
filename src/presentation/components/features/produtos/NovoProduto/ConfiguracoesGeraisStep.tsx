'use client'

import { Button } from '@/src/presentation/components/ui/button'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'

interface ConfiguracoesGeraisStepProps {
  favorito: boolean
  onFavoritoChange: (value: boolean) => void
  permiteDesconto: boolean
  onPermiteDescontoChange: (value: boolean) => void
  permiteAcrescimo: boolean
  onPermiteAcrescimoChange: (value: boolean) => void
  abreComplementos: boolean
  onAbreComplementosChange: (value: boolean) => void
  permiteAlterarPreco: boolean
  onPermiteAlterarPrecoChange: (value: boolean) => void
  incideTaxa: boolean
  onIncideTaxaChange: (value: boolean) => void
  grupoComplementosIds: string[]
  onGrupoComplementosIdsChange: (value: string[]) => void
  impressorasIds: string[]
  onImpressorasIdsChange: (value: string[]) => void
  ativo: boolean
  onAtivoChange: (value: boolean) => void
  isEditMode: boolean
  canManageAtivo?: boolean
  onBack: () => void
  onSave: () => void
  onSaveAndClose: () => void
  saveButtonText?: string
  hideStepFooter?: boolean
}

/**
 * Step 2: Configurações Gerais
 * Exibe apenas o cartão "Geral" com os toggles booleanos do produto.
 * Complementos e Impressoras são gerenciados nas abas superiores do modal.
 */
export function ConfiguracoesGeraisStep({
  favorito,
  onFavoritoChange,
  permiteDesconto,
  onPermiteDescontoChange,
  permiteAcrescimo,
  onPermiteAcrescimoChange,
  abreComplementos,
  onAbreComplementosChange,
  permiteAlterarPreco,
  onPermiteAlterarPrecoChange,
  incideTaxa,
  onIncideTaxaChange,
  ativo,
  onAtivoChange,
  canManageAtivo = false,
  onBack,
  onSave,
  onSaveAndClose,
  saveButtonText = 'Salvar',
  hideStepFooter = false,
}: ConfiguracoesGeraisStepProps) {
  const toggles = [
    { label: 'Favorito',              checked: favorito,            onChange: onFavoritoChange },
    { label: 'Permite Desconto',      checked: permiteDesconto,     onChange: onPermiteDescontoChange },
    { label: 'Permite Acréscimo',     checked: permiteAcrescimo,    onChange: onPermiteAcrescimoChange },
    { label: 'Permitir Alterar Preço',checked: permiteAlterarPreco, onChange: onPermiteAlterarPrecoChange },
    { label: 'Incide Taxa',           checked: incideTaxa,          onChange: onIncideTaxaChange },
    { label: 'Abre Complementos',     checked: abreComplementos,    onChange: onAbreComplementosChange },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col rounded-[10px] bg-info p-2 md:p-4">
        <div className="mb-4 flex shrink-0 flex-col gap-2">
          <div className="flex items-center gap-5">
            <h2 className="font-exo text-xl font-semibold text-primary">Configurações Gerais</h2>
            <div className="h-px flex-1 bg-primary/70" />
          </div>
          <p className="font-nunito text-sm text-secondary-text">
            Ajuste como o produto se comporta no PDV.
          </p>
        </div>

        <div className="rounded-lg border border-[#E6E9F4] bg-gradient-to-b from-[#F9FAFF] to-white px-3 py-2 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
          <h4 className="mb-3 font-exo text-sm font-semibold text-primary-text">Geral</h4>
          <div className="flex flex-col gap-2">
            {toggles.map(toggle => (
              <JiffyIconSwitch
                key={toggle.label}
                checked={toggle.checked}
                onChange={e => toggle.onChange(e.target.checked)}
                label={
                  <span className="font-nunito text-sm font-medium text-primary-text">
                    {toggle.label}
                  </span>
                }
                labelPosition="start"
                bordered={false}
                size="sm"
                className="w-full justify-between rounded-md bg-white/80 px-2 py-1"
                inputProps={{ 'aria-label': toggle.label }}
              />
            ))}

          </div>
        </div>

        {!hideStepFooter ? (
          <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Button
              onClick={onBack}
              className="h-8 rounded-lg border-2 px-10 font-exo text-sm font-semibold hover:bg-primary/20"
              sx={{
                backgroundColor: 'var(--color-info)',
                color: 'var(--color-primary)',
                borderColor: 'var(--color-primary)',
                border: '1px solid',
              }}
            >
              Voltar
            </Button>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end md:w-auto">
              <Button
                type="button"
                onClick={onSaveAndClose}
                className="h-8 rounded-lg border-2 px-6 font-exo text-sm font-semibold hover:bg-primary/10 sm:px-8"
                sx={{
                  backgroundColor: 'var(--color-info)',
                  color: 'var(--color-primary)',
                  borderColor: 'var(--color-primary)',
                  border: '1px solid',
                }}
              >
                Salvar e fechar
              </Button>
              <Button
                onClick={onSave}
                className="h-8 rounded-lg px-10 font-exo text-sm font-semibold text-white hover:bg-primary/90"
                sx={{ backgroundColor: 'var(--color-primary)' }}
              >
                {saveButtonText}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
