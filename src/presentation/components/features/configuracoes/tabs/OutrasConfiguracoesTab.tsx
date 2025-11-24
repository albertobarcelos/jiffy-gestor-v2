'use client'

import { useState } from 'react'

/**
 * Tab de Outras Configurações - Configurações gerais de vendas PDV e impressões
 */
export function OutrasConfiguracoesTab() {
  const [isEditingVendasPDV, setIsEditingVendasPDV] = useState(false)
  const [isEditingImpressoes, setIsEditingImpressoes] = useState(false)

  // Configurações de Vendas PDV (simplificado - apenas alguns campos principais)
  const [identificaComandaMesa, setIdentificaComandaMesa] = useState(false)
  const [observacaoBalcao, setObservacaoBalcao] = useState(true)
  const [valorAcrescimo, setValorAcrescimo] = useState('8.0')
  const [valorDesconto, setValorDesconto] = useState('0.0')

  // Configurações de Impressões
  const [cabecalho, setCabecalho] = useState('')
  const [rodape, setRodape] = useState('')

  return (
    <div className="p-6 space-y-6">
      {/* Configurações de Vendas PDV */}
      <div className="bg-info rounded-[10px] p-[18px] space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-primary text-base font-semibold font-exo mb-1">
              Vendas PDV
            </h3>
            <p className="text-secondary-text text-sm font-nunito">
              Altere as configurações das vendas realizadas no Ponto de Venda
            </p>
          </div>
          {!isEditingVendasPDV && (
            <button
              onClick={() => setIsEditingVendasPDV(true)}
              className="h-9 px-4 bg-alternate text-white rounded-[50px] text-sm font-medium font-exo hover:bg-alternate/90 transition-colors"
            >
              Editar
            </button>
          )}
          {isEditingVendasPDV && (
            <button
              onClick={() => {
                setIsEditingVendasPDV(false)
                // TODO: Salvar configurações
                alert('Configurações salvas!')
              }}
              className="h-9 px-4 bg-alternate text-white rounded-[50px] text-sm font-medium font-exo hover:bg-alternate/90 transition-colors flex items-center gap-2"
            >
              <span>✓</span> Salvar
            </button>
          )}
        </div>

        <div className="border-t border-[#B9CCD8] pt-6 space-y-4">
          <h4 className="text-secondary text-sm font-bold font-nunito">
            Identificação
          </h4>

          {/* Switch para Identifica Comanda/Mesa */}
          <div className="bg-[#EEEEF5] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-primary-text mb-1">
                  Identifica Comanda/Mesa
                </p>
                <p className="text-xs text-secondary-text">
                  Solicita a identificação do cliente ao abrir comanda ou mesa na venda
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={identificaComandaMesa}
                  onChange={(e) => {
                    setIdentificaComandaMesa(e.target.checked)
                    setIsEditingVendasPDV(true)
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-secondary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent1"></div>
              </label>
            </div>
          </div>

          {/* Switch para Observação Balcão */}
          <div className="bg-[#EEEEF5] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-primary-text mb-1">
                  Observação Balcão
                </p>
                <p className="text-xs text-secondary-text">
                  Permite adicionar observações nas vendas de balcão
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={observacaoBalcao}
                  onChange={(e) => {
                    setObservacaoBalcao(e.target.checked)
                    setIsEditingVendasPDV(true)
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-secondary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent1"></div>
              </label>
            </div>
          </div>

          {/* Campos de valores */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-primary-text mb-2">
                Valor Acréscimo
              </label>
              <input
                type="number"
                step="0.01"
                value={valorAcrescimo}
                onChange={(e) => {
                  setValorAcrescimo(e.target.value)
                  setIsEditingVendasPDV(true)
                }}
                disabled={!isEditingVendasPDV}
                className="w-full h-12 px-4 rounded-lg border border-secondary bg-primary-bg text-primary-text focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-text mb-2">
                Valor Desconto
              </label>
              <input
                type="number"
                step="0.01"
                value={valorDesconto}
                onChange={(e) => {
                  setValorDesconto(e.target.value)
                  setIsEditingVendasPDV(true)
                }}
                disabled={!isEditingVendasPDV}
                className="w-full h-12 px-4 rounded-lg border border-secondary bg-primary-bg text-primary-text focus:outline-none focus:border-primary disabled:opacity-50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Configurações de Impressões */}
      <div className="bg-info rounded-[10px] p-[18px] space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-primary text-base font-semibold font-exo mb-1">
              Impressões
            </h3>
            <p className="text-secondary-text text-sm font-nunito">
              Configure as impressões do sistema
            </p>
          </div>
          {!isEditingImpressoes && (
            <button
              onClick={() => setIsEditingImpressoes(true)}
              className="h-9 px-4 bg-alternate text-white rounded-[50px] text-sm font-medium font-exo hover:bg-alternate/90 transition-colors"
            >
              Editar
            </button>
          )}
          {isEditingImpressoes && (
            <button
              onClick={() => {
                setIsEditingImpressoes(false)
                // TODO: Salvar configurações
                alert('Configurações de impressões salvas!')
              }}
              className="h-9 px-4 bg-alternate text-white rounded-[50px] text-sm font-medium font-exo hover:bg-alternate/90 transition-colors flex items-center gap-2"
            >
              <span>✓</span> Salvar
            </button>
          )}
        </div>

        <div className="border-t border-[#B9CCD8] pt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary-text mb-2">
              Cabeçalho
            </label>
            <textarea
              value={cabecalho}
              onChange={(e) => {
                setCabecalho(e.target.value)
                setIsEditingImpressoes(true)
              }}
              disabled={!isEditingImpressoes}
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-secondary bg-primary-bg text-primary-text focus:outline-none focus:border-primary disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-text mb-2">
              Rodapé
            </label>
            <textarea
              value={rodape}
              onChange={(e) => {
                setRodape(e.target.value)
                setIsEditingImpressoes(true)
              }}
              disabled={!isEditingImpressoes}
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-secondary bg-primary-bg text-primary-text focus:outline-none focus:border-primary disabled:opacity-50"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

