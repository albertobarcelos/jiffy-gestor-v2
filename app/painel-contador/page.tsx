'use client'

import { MdAccountBalance, MdDescription, MdAssessment, MdReceipt, MdTrendingUp, MdTrendingDown, MdFileDownload, MdSettings } from 'react-icons/md'

/**
 * Painel do Contador
 * Módulo para gerenciamento contábil e fiscal
 */
export default function PainelContadorPage() {
  return (
    <div className="h-full bg-gray-50 p-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <MdAccountBalance className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 font-heading">Painel do Contador</h1>
              <p className="text-sm text-gray-500 mt-0.5">Gestão contábil e fiscal integrada</p>
            </div>
          </div>
        </div>

        {/* Grid de Seções */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Passo a Passo */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MdDescription className="w-5 h-5 text-blue-600" />
              Passo a Passo
            </h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">
                  1
                </span>
                <span className="text-sm text-gray-700">Identificação do Contador</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">
                  2
                </span>
                <div className="flex-1">
                  <span className="text-sm text-gray-700">Importe seu Plano de Contas</span>
                  <button className="mt-1 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    <MdFileDownload className="w-3 h-3" />
                    Importar Planilha
                  </button>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">
                  3
                </span>
                <div className="flex-1">
                  <span className="text-sm text-gray-700">Configurar a Integração Contábil</span>
                  <button className="mt-1 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    <MdFileDownload className="w-3 h-3" />
                    Importar Planilha
                  </button>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">
                  4
                </span>
                <span className="text-sm text-gray-700">Configurar a Integração Fiscal e SPED</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">
                  5
                </span>
                <span className="text-sm text-gray-700">Gerar os Arquivos de Integração</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">
                  6
                </span>
                <span className="text-sm text-gray-700">Fechamento dos Períodos Contábeis</span>
              </li>
            </ul>
          </div>

          {/* Finanças */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MdTrendingUp className="w-5 h-5 text-green-600" />
              Finanças
            </h2>
            <ul className="space-y-3">
              <li>
                <button className="w-full text-left text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors">
                  Exibir todas as Contas a Pagar
                </button>
              </li>
              <li>
                <button className="w-full text-left text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors">
                  Exibir todas as Contas a Receber
                </button>
              </li>
              <li>
                <button className="w-full text-left text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors">
                  Exibir o Extrato das Contas
                </button>
              </li>
            </ul>
          </div>

          {/* Relatórios */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MdAssessment className="w-5 h-5 text-purple-600" />
              Relatórios
            </h2>
            <ul className="space-y-3">
              <li>
                <button className="w-full text-left text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors">
                  Contas a Pagar
                </button>
              </li>
              <li>
                <button className="w-full text-left text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors">
                  Pagamentos Realizados
                </button>
              </li>
              <li>
                <button className="w-full text-left text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors">
                  Contas a Receber
                </button>
              </li>
              <li>
                <button className="w-full text-left text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors">
                  Recebimentos Realizados
                </button>
              </li>
            </ul>
          </div>

          {/* Notas de Serviços Tomados */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MdReceipt className="w-5 h-5 text-orange-600" />
              Notas de Serviços Tomados
            </h2>
            <ul className="space-y-3">
              <li>
                <button className="w-full text-left text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors">
                  Por Período
                </button>
              </li>
              <li>
                <button className="w-full text-left text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors">
                  Por Mês/Ano
                </button>
              </li>
              <li>
                <button className="w-full text-left text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors">
                  Por Categoria
                </button>
              </li>
              <li>
                <button className="w-full text-left text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors">
                  Por Fornecedor
                </button>
              </li>
              <li>
                <button className="w-full text-left text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors">
                  Por Departamento
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Meus Relatórios */}
        <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <MdSettings className="w-5 h-5 text-gray-600" />
              Meus Relatórios
            </h2>
            <button className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <MdSettings className="w-4 h-4" />
              Configurar
            </button>
          </div>
          <div className="space-y-3">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Pagamentos por período</h3>
              <p className="text-xs text-gray-500 mb-2">
                Você pode escolher quais relatórios devem aparecer aqui.
              </p>
              <p className="text-xs text-gray-500">
                Clique aqui para compartilhar o seu relatório com outros usuários, excluir ou alterar.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

