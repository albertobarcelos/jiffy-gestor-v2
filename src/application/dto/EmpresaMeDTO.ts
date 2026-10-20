/** Endereço da empresa (GET `/api/empresas/me`) — usado em cupom e WhatsApp. */
export interface EnderecoEmpresaMe {
  rua?: string | null
  numero?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
  cep?: string | null
  complemento?: string | null
}

/** Resumo da empresa da sessão (mesma rota usada em configurações / painel contador). */
export interface EmpresaMeResumo {
  id: string
  nomeExibicao: string
  cnpj?: string
  cidade?: string
  estado?: string
  endereco?: EnderecoEmpresaMe | null
}
