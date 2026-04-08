'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useTabsStore } from '@/src/presentation/stores/tabsStore'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Button } from '@/src/presentation/components/ui/button'
import { MdSettings, MdWarning, MdDelete, MdInfo, MdCheckCircle, MdRefresh } from 'react-icons/md'
import { CertificadoUploadModal } from './CertificadoUploadModal'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/src/presentation/components/ui/dialog'
import { showToast } from '@/src/shared/utils/toast'

export function Etapa1DadosFiscaisEmpresa() {
  const { addTab } = useTabsStore()
  const { isRehydrated } = useAuthStore()
  const [certificado, setCertificado] = useState<any>(null)
  const [isLoadingCertificado, setIsLoadingCertificado] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  
  // Estado para verificação de dados completos
  const [dadosCompletos, setDadosCompletos] = useState<boolean | null>(null)
  const [isVerificandoDados, setIsVerificandoDados] = useState(false)

  // Busca dados do certificado
  const loadCertificado = useCallback(async () => {
    setIsLoadingCertificado(true)
    try {
      const response = await fetch('/api/certificado')
      
      const result = await response.json()
      
      // Se a resposta indica sucesso (mesmo que data seja null), não há erro
      if (result.success) {
        setCertificado(result.data) // Pode ser null se não houver certificado
      } else {
        // Apenas logar erro se for um erro real (não "não encontrado")
        console.error('Erro ao carregar certificado:', result.message)
        setCertificado(null)
      }
    } catch (error) {
      console.error('Erro ao carregar certificado:', error)
      setCertificado(null)
    } finally {
      setIsLoadingCertificado(false)
    }
  }, [])

  // Função para verificar se todos os dados obrigatórios estão preenchidos
  const verificarDadosCompletos = useCallback(async () => {
    setIsVerificandoDados(true)
    try {
      // Buscar dados da empresa
      const empresaResponse = await fetch('/api/empresas/me')
      if (!empresaResponse.ok) {
        setDadosCompletos(false)
        return
      }

      const empresaData = await empresaResponse.json()

      // Buscar configuração fiscal
      const fiscalResponse = await fetch('/api/v1/fiscal/empresas-fiscais/me')
      let configFiscal = null
      if (fiscalResponse.ok) {
        configFiscal = await fiscalResponse.json()
      }

      // Verificar campos obrigatórios da empresa
      const cnpjPreenchido = empresaData?.cnpj && empresaData.cnpj.trim().length >= 14
      const razaoSocialPreenchida = empresaData?.razaoSocial?.trim() || empresaData?.nome?.trim()
      const estadoPreenchido = empresaData?.endereco?.estado?.trim() || empresaData?.endereco?.uf?.trim()

      // Verificar campos obrigatórios fiscais
      const inscricaoEstadualPreenchida = configFiscal?.inscricaoEstadual === 'ISENTO' || 
                                         (configFiscal?.inscricaoEstadual && configFiscal.inscricaoEstadual.trim().length > 0)
      const regimeTributarioPreenchido = configFiscal?.codigoRegimeTributario && 
                                        [1, 2, 3].includes(configFiscal.codigoRegimeTributario)

      // Todos os campos obrigatórios devem estar preenchidos
      const completo = cnpjPreenchido && 
                      razaoSocialPreenchida && 
                      estadoPreenchido && 
                      inscricaoEstadualPreenchida && 
                      regimeTributarioPreenchido

      setDadosCompletos(completo)
    } catch (error) {
      console.error('Erro ao verificar dados completos:', error)
      setDadosCompletos(false)
    } finally {
      setIsVerificandoDados(false)
    }
  }, [])

  useEffect(() => {
    if (isRehydrated) {
      loadCertificado()
      verificarDadosCompletos()
    }
  }, [isRehydrated, loadCertificado, verificarDadosCompletos])

  // Recarregar verificação quando a página receber foco (usuário voltou da configuração)
  useEffect(() => {
    const handleFocus = () => {
      if (isRehydrated) {
        verificarDadosCompletos()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [isRehydrated, verificarDadosCompletos])

  // Calcula dias restantes até expiração
  const calcularDiasRestantes = (dataValidade: string | null | undefined): number | null => {
    if (!dataValidade) return null
    const hoje = new Date()
    const validade = new Date(dataValidade)
    const diffTime = validade.getTime() - hoje.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Formata data para exibição
  const formatarData = (dataISO: string): string => {
    const data = new Date(dataISO)
    return data.toLocaleDateString('pt-BR')
  }

  const handleOpenCertificadoConfig = () => {
    // Verificar se os dados fiscais estão completos antes de permitir cadastrar certificado
    if (dadosCompletos === false) {
      showToast.warning('Complete primeiro todos os dados fiscais da empresa antes de cadastrar o certificado digital.')
      return
    }
    
    // Se dadosCompletos ainda está sendo verificado (null), aguardar
    if (dadosCompletos === null && !isVerificandoDados) {
      showToast.warning('Aguarde a verificação dos dados fiscais.')
      return
    }
    
    setShowUploadModal(true)
  }

  const handleOpenConfirmRemover = () => {
    if (!certificado) return
    setShowConfirmModal(true)
  }

  const handleConfirmRemover = async () => {
    if (!certificado) return

    setIsRemoving(true)
    const toastId = showToast.loading('Removendo certificado...')

    try {
      const response = await fetch('/api/certificado', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao remover certificado')
      }

      showToast.successLoading(toastId, 'Certificado removido com sucesso!')
      setShowConfirmModal(false)
      
      // Recarregar dados (agora não terá certificado)
      await loadCertificado()
    } catch (error: any) {
      console.error('Erro ao remover certificado:', error)
      showToast.errorLoading(toastId, error.message || 'Erro ao remover certificado')
    } finally {
      setIsRemoving(false)
    }
  }

  const handleCertificadoSuccess = async () => {
    // Aguardar um pouco para garantir que o certificado foi salvo no banco
    await new Promise(resolve => setTimeout(resolve, 500))
    // Recarregar dados do certificado
    await loadCertificado()
    // Recarregar verificação de dados (caso tenha mudado algo)
    await verificarDadosCompletos()
  }

  return (
    <>
      <CertificadoUploadModal 
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={handleCertificadoSuccess}
      />

      {/* Modal de Confirmação de Remoção */}
      <Dialog 
        open={showConfirmModal} 
        onOpenChange={setShowConfirmModal}
        maxWidth="xs"
        fullWidth
      >
        <DialogContent sx={{ p: 3 }}>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100">
                <MdWarning className="text-red-600" size={24} />
              </div>
              <DialogTitle sx={{ fontSize: '1.25rem', fontWeight: 600, color: '#dc2626' }}>
                Confirmar Remoção do Certificado
              </DialogTitle>
            </div>
            <DialogDescription>
              <span className="block mt-2 text-sm leading-relaxed">
                Tem certeza que deseja remover o certificado digital?
              </span>
            </DialogDescription>
          </DialogHeader>

          {certificado && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-inter font-medium text-secondary-text text-sm">
                    Ambiente:
                  </span>
                  <span className="font-inter font-semibold text-primary text-sm">
                    {certificado.ambiente === 'HOMOLOGACAO' ? 'Homologação' : 'Produção'}
                  </span>
                </div>
                {certificado.validadeCertificado && (
                  <div className="flex items-center justify-between">
                    <span className="font-inter font-medium text-secondary-text text-sm">
                      Validade:
                    </span>
                    <span className="font-inter font-semibold text-secondary-text text-sm">
                      {formatarData(certificado.validadeCertificado)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="font-inter font-medium text-amber-800 text-sm">
              ⚠️ Após a remoção, não será mais possível emitir notas fiscais até que um novo certificado seja cadastrado.
            </p>
          </div>

          <DialogFooter sx={{ mt: 3, gap: 2 }}>
            <Button
              onClick={() => setShowConfirmModal(false)}
              disabled={isRemoving}
              className="rounded-lg px-4 py-2 text-sm font-medium"
              sx={{
                backgroundColor: '#f3f4f6',
                color: '#374151',
                '&:hover': { backgroundColor: '#e5e7eb' },
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmRemover}
              disabled={isRemoving}
              className="rounded-lg px-4 py-2 text-white text-sm font-medium flex items-center gap-2"
              sx={{
                backgroundColor: '#dc2626',
                '&:hover': { backgroundColor: '#b91c1c' },
                '&:disabled': { backgroundColor: '#fca5a5' },
              }}
            >
              <MdDelete size={18} />
              {isRemoving ? 'Removendo...' : 'Confirmar Remoção'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <div className="flex flex-col gap-4 p-2 sm:p-4">
        {/* Passo 1: Configurar Dados Fiscais */}
        <div className="flex flex-col gap-4 rounded-lg border-2 border-alternate/30 bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="md:flex-shrink-0 md:flex hidden items-center justify-center w-10 h-10 rounded-full bg-alternate text-white font-semibold text-lg">
              1
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex flex-col gap-2">
                <h3 className="font-exo font-semibold text-alternate text-lg sm:text-xl">
                  Passo 1: Configurar Dados Fiscais da Empresa
                </h3>
                <p className="font-inter font-normal text-secondary-text text-sm sm:text-base leading-relaxed">
                  Primeiro, configure os dados fiscais da sua empresa. É necessário informar corretamente o CNPJ, 
                  Inscrição Estadual (IE), Inscrição Municipal (IM) e o Regime Tributário para que o sistema 
                  possa funcionar adequadamente.
                </p>
                <div className="flex items-start gap-2 mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <MdInfo className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                  <p className="font-inter font-medium text-blue-800 text-xs sm:text-sm">
                    <strong>Importante:</strong> Complete esta etapa antes de cadastrar o certificado digital. 
                    Os dados fiscais são essenciais para a emissão de notas fiscais.
                  </p>
                </div>
                
                {/* Status dos Dados Fiscais */}
                {isVerificandoDados ? (
                  <div className="flex items-start gap-2 mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="w-4 h-4 border-2 border-alternate border-t-transparent rounded-full animate-spin flex-shrink-0 mt-0.5" />
                    <p className="font-inter font-medium text-gray-700 text-xs sm:text-sm">
                      Verificando dados fiscais...
                    </p>
                  </div>
                ) : dadosCompletos === true ? (
                  <div className="flex items-start gap-2 mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <MdCheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                    <div className="flex-1">
                      <p className="font-inter font-semibold text-green-800 text-xs sm:text-sm mb-2">
                        ✓ Todos os dados fiscais estão preenchidos corretamente. Você pode prosseguir para o cadastro do certificado digital.
                      </p>
                      <button
                        onClick={verificarDadosCompletos}
                        className="flex items-center gap-1 text-green-700 hover:text-green-900 text-xs font-medium transition-colors"
                      >
                        <MdRefresh size={14} />
                        Verificar novamente
                      </button>
                    </div>
                  </div>
                ) : dadosCompletos === false ? (
                  <div className="flex items-start gap-2 mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <MdWarning className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
                    <div className="flex-1">
                      <p className="font-inter font-semibold text-amber-800 text-xs sm:text-sm mb-2">
                        ⚠️ Alguns dados fiscais obrigatórios estão faltando. Clique em "Configurar Dados Fiscais" para completar as informações necessárias.
                      </p>
                      <button
                        onClick={verificarDadosCompletos}
                        className="flex items-center gap-1 text-amber-700 hover:text-amber-900 text-xs font-medium transition-colors"
                      >
                        <MdRefresh size={14} />
                        Verificar novamente
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="flex md:justify-end justify-center">
                <Button
                  onClick={() => {
                    addTab({
                      id: 'config-empresa-completa',
                      label: 'Configuração Completa',
                      path: '/painel-contador/config/empresa-completa',
                    })
                  }}
                  className="rounded-lg px-6 py-2.5 text-white text-sm font-medium flex items-center gap-2"
                  sx={{
                    backgroundColor: 'var(--color-secondary)',
                    '&:hover': { backgroundColor: 'var(--color-alternate)' },
                  }}
                >
                  <MdSettings size={18} />
                  Configurar Dados Fiscais
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Passo 2: Gerenciar Certificado Digital */}
        <div className="flex flex-col gap-4 rounded-lg border-2 border-alternate/30 bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="md:flex-shrink-0 md:flex hidden items-center justify-center w-10 h-10 rounded-full bg-alternate text-white font-semibold text-lg">
              2
            </div>
            <div className="flex-1 flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <h3 className="font-exo font-semibold text-alternate text-lg sm:text-xl">
                  Passo 2: Gerenciar Certificado Digital
                </h3>
                <p className="font-inter font-normal text-secondary-text text-sm sm:text-base leading-relaxed">
                  Após configurar os dados fiscais, cadastre o certificado digital (A1) da empresa. O certificado 
                  é necessário para autenticar a comunicação com a SEFAZ e permitir a emissão de notas fiscais eletrônicas.
                </p>
                {certificado && (
                  <div className="flex items-start gap-2 mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <MdCheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                    <div className="flex-1">
                      <p className="font-inter font-semibold text-green-800 text-xs sm:text-sm mb-1">
                        Certificado digital cadastrado e ativo
                      </p>
                      <div className="flex flex-col gap-1 mt-2">
                        <span className="font-inter font-medium text-green-700 text-xs sm:text-sm">
                          <strong>Tipo:</strong> A1
                        </span>
                        <span className="font-inter font-medium text-green-700 text-xs sm:text-sm">
                          <strong>Validade:</strong> {certificado.validadeCertificado ? formatarData(certificado.validadeCertificado) : '--'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {!certificado && (
                  <div className="flex items-start gap-2 mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <MdWarning className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
                    <p className="font-inter font-medium text-amber-800 text-xs sm:text-sm">
                      Nenhum certificado cadastrado. Cadastre um certificado digital para habilitar a emissão de notas fiscais.
                    </p>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-3">
                {certificado && certificado.validadeCertificado && (() => {
                  const diasRestantes = calcularDiasRestantes(certificado.validadeCertificado)
                  if (diasRestantes === null) return null
                  
                  const isExpiringSoon = diasRestantes <= 30
                  const isExpired = diasRestantes < 0
                  
                  return (
                    <div 
                      className={`font-medium text-sm rounded-lg px-4 py-3 text-center ${
                        isExpired 
                          ? 'bg-red-100 text-red-700 border border-red-300' 
                          : isExpiringSoon 
                          ? 'bg-amber-100 text-amber-700 border border-amber-300' 
                          : 'bg-green-100 text-green-700 border border-green-300'
                      }`}
                    >
                      {isExpired 
                        ? '⚠️ Certificado Expirado - Renove imediatamente' 
                        : isExpiringSoon
                        ? `⚠️ Certificado expira em ${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''} - Renove em breve`
                        : `✓ Certificado válido - Expira em ${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''}`}
                    </div>
                  )
                })()}
                <div className="flex flex-col gap-3">
                  {/* Mensagem de aviso se dados não estiverem completos e não houver certificado */}
                  {!certificado && dadosCompletos === false && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <MdWarning className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                      <p className="font-inter font-medium text-red-800 text-xs sm:text-sm">
                        <strong>Atenção:</strong> Complete primeiro todos os dados fiscais da empresa (Passo 1) antes de cadastrar o certificado digital.
                      </p>
                    </div>
                  )}
                  
                  <div className="flex flex-row items-center gap-3">
                    {certificado ? (
                      <Button
                        onClick={handleOpenConfirmRemover}
                        className="rounded-lg px-4 py-2.5 text-white text-sm font-medium flex-1 flex items-center justify-center gap-2"
                        disabled={isLoadingCertificado}
                        sx={{
                          backgroundColor: '#dc2626',
                          '&:hover': { backgroundColor: '#b91c1c' },
                          '&:disabled': { backgroundColor: '#fca5a5', cursor: 'not-allowed' },
                        }}
                      >
                        <MdDelete size={18} />
                        Remover Certificado
                      </Button>
                    ) : (
                      <Button
                        onClick={handleOpenCertificadoConfig}
                        className="rounded-lg px-4 py-2.5 text-white text-sm font-medium flex-1 flex items-center justify-center gap-2"
                        disabled={isLoadingCertificado}
                        sx={{
                          backgroundColor: (dadosCompletos === false || (dadosCompletos === null && !isVerificandoDados))
                            ? '#cbd5e1'
                            : 'var(--color-secondary)',
                          '&:hover': { 
                            backgroundColor: (dadosCompletos === false || (dadosCompletos === null && !isVerificandoDados))
                              ? '#cbd5e1'
                              : 'var(--color-alternate)' 
                          },
                          '&:disabled': { backgroundColor: '#cbd5e1', cursor: 'not-allowed' },
                          cursor: (dadosCompletos === false || (dadosCompletos === null && !isVerificandoDados))
                            ? 'not-allowed'
                            : 'pointer',
                        }}
                      >
                        <MdSettings size={18} />
                        {isLoadingCertificado ? 'Carregando...' : 'Cadastrar Certificado'}
                      </Button>
                    )}
                    {certificado && (
                      <Button
                        onClick={handleOpenCertificadoConfig}
                        className="rounded-lg px-4 py-2.5 text-white text-sm font-medium flex-1 flex items-center justify-center gap-2"
                        disabled={isLoadingCertificado}
                        sx={{
                          backgroundColor: 'var(--color-secondary)',
                          '&:hover': { backgroundColor: 'var(--color-alternate)' },
                          '&:disabled': { backgroundColor: '#cbd5e1', cursor: 'not-allowed' },
                        }}
                      >
                        <MdSettings size={18} />
                        Atualizar Certificado
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
