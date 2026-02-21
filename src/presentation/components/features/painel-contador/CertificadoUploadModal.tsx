'use client'

import React, { useState } from 'react'
import { Button } from '@/src/presentation/components/ui/button'
import { Input } from '@/src/presentation/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/src/presentation/components/ui/dialog'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import { MdUploadFile, MdLock } from 'react-icons/md'

interface CertificadoUploadModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CertificadoUploadModal({ open, onClose, onSuccess }: CertificadoUploadModalProps) {
  const { auth } = useAuthStore()
  const [file, setFile] = useState<File | null>(null)
  const [senha, setSenha] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [cnpj, setCnpj] = useState('')
  const [uf, setUf] = useState('SP')
  const [ambiente, setAmbiente] = useState<'HOMOLOGACAO' | 'PRODUCAO'>('HOMOLOGACAO')

  // Buscar dados da empresa ao abrir modal
  React.useEffect(() => {
    if (open) {
      const loadEmpresa = async () => {
        const token = auth?.getAccessToken()
        if (!token) return
        try {
          const response = await fetch('/api/empresas/me', {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!response.ok) return
          const data = await response.json()
          if (data?.cnpj) {
            // Remove caracteres especiais do CNPJ
            const cnpjNumeros = data.cnpj.replace(/\D/g, '')
            setCnpj(cnpjNumeros)
          }
          if (data?.uf) setUf(data.uf)
        } catch (error) {
          console.error('Erro ao carregar empresa:', error)
        }
      }
      loadEmpresa()
    }
  }, [open, auth])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validar extensão (apenas .pfx ou .p12)
      const ext = selectedFile.name.split('.').pop()?.toLowerCase()
      if (ext !== 'pfx' && ext !== 'p12') {
        showToast.error('Arquivo inválido. Selecione um certificado .pfx ou .p12')
        return
      }
      setFile(selectedFile)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      showToast.error('Selecione um arquivo de certificado')
      return
    }

    if (!senha || senha.trim() === '') {
      showToast.error('Digite a senha do certificado')
      return
    }

    const toastId = showToast.loading('Enviando certificado...')
    setIsUploading(true)

    try {
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.errorLoading(toastId, 'Sessão expirada. Faça login novamente.')
        return
      }

      // Converter arquivo para base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          // Remove o prefixo "data:application/...;base64,"
          const base64Data = result.split(',')[1]
          resolve(base64Data)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // Preparar dados para envio
      const requestBody = {
        uf: uf.toUpperCase(), // Garantir maiúsculo
        ambiente: ambiente, // Já está como 'HOMOLOGACAO' ou 'PRODUCAO'
        cnpj: cnpj,
        certificadoPfx: base64,
        senhaCertificado: senha,
        aliasCertificado: file.name.replace(/\.(pfx|p12)$/i, ''),
      }

      console.log('📤 Enviando certificado:', {
        uf: requestBody.uf,
        ambiente: requestBody.ambiente,
        cnpj: requestBody.cnpj,
        aliasCertificado: requestBody.aliasCertificado,
      })

      // Enviar para o fiscal service via backend proxy
      const response = await fetch('/api/certificado', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('❌ Erro do servidor:', error)
        throw new Error(error.message || error.error || 'Erro ao cadastrar certificado')
      }

      showToast.successLoading(toastId, 'Certificado cadastrado com sucesso!')
      
      // Resetar form
      setFile(null)
      setSenha('')
      
      // Chamar callback de sucesso e fechar modal
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Erro ao enviar certificado:', error)
      showToast.errorLoading(toastId, error.message || 'Erro ao enviar certificado')
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    if (!isUploading) {
      setFile(null)
      setSenha('')
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-primary">
            Cadastrar Certificado Digital
          </DialogTitle>
          <DialogDescription className="text-secondary-text">
            Faça upload do arquivo .pfx ou .p12 e informe a senha do certificado
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          {/* Upload de arquivo */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-primary">
              Arquivo do Certificado
            </label>
            <div className="flex flex-col gap-2">
              <label 
                htmlFor="certificado-file" 
                className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 px-4 py-6 cursor-pointer hover:border-primary/50 hover:bg-primary/10 transition-colors"
              >
                <MdUploadFile className="text-primary" size={24} />
                <span className="text-sm font-medium text-primary">
                  {file ? file.name : 'Clique para selecionar o arquivo'}
                </span>
              </label>
              <input
                id="certificado-file"
                type="file"
                accept=".pfx,.p12"
                onChange={handleFileChange}
                className="hidden"
                disabled={isUploading}
              />
              <p className="text-xs text-secondary-text">
                Formatos aceitos: .pfx, .p12 (Certificado A1)
              </p>
            </div>
          </div>

          {/* Ambiente */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-primary">
              Ambiente
            </label>
            <select
              value={ambiente}
              onChange={(e) => setAmbiente(e.target.value as 'HOMOLOGACAO' | 'PRODUCAO')}
              disabled={isUploading}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="HOMOLOGACAO">Homologação</option>
              <option value="PRODUCAO">Produção</option>
            </select>
            <p className="text-xs text-secondary-text">
              Use Homologação para testes e Produção para emissões reais
            </p>
          </div>

          {/* Campo de senha */}
          <div className="flex flex-col gap-2">
            <label htmlFor="senha-cert" className="text-sm font-medium text-primary">
              Senha do Certificado
            </label>
            <div className="relative">
              <MdLock className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text" size={20} />
              <Input
                id="senha-cert"
                type="password"
                placeholder="Digite a senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                disabled={isUploading}
                className="pl-10"
              />
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 mt-4">
            <Button
              onClick={handleClose}
              disabled={isUploading}
              variant="outlined"
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={isUploading || !file || !senha}
              className="flex-1"
              sx={{
                backgroundColor: 'var(--color-secondary)',
                '&:hover': { backgroundColor: 'var(--color-alternate)' },
              }}
            >
              {isUploading ? 'Enviando...' : 'Cadastrar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
