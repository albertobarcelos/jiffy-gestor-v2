'use client'

import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Card, CardContent, Typography, Box, Button } from '@mui/material'
import { MdPerson, MdLock, MdEdit } from 'react-icons/md'
import { useRouter } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

/**
 * Página de perfil do usuário
 * Exibe informações do usuário logado e permite edição
 */
function PerfilContent() {
  const { getUser, isAuthenticated } = useAuthStore()
  const router = useRouter()
  const user = getUser()
  const [isHydrated, setIsHydrated] = useState(false)

  // Marcar como hidratado apenas no cliente (evita hydration mismatch)
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (isHydrated && (!isAuthenticated || !user)) {
      router.push('/login')
    }
  }, [isAuthenticated, user, router, isHydrated])

  // Mostrar loading enquanto hidrata
  if (!isHydrated || !user) {
    return null
  }

  const userName = user.getName() || 'Usuário'
  const userEmail = user.getEmail()
  const userInitial = userName.charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Meu Perfil</h1>
          <p className="text-gray-600 mt-1">Gerencie suas informações pessoais</p>
        </div>

        {/* Card Principal */}
        <Card className="shadow-lg">
          <Box
            sx={{
              background: 'linear-gradient(to right, rgb(0, 51, 102), rgba(0, 51, 102, 0.8))',
              color: 'white',
              p: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '4px solid rgba(255, 255, 255, 0.3)',
                }}
              >
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'white' }}>
                  {userInitial}
                </Typography>
              </Box>
              <Box>
                <Typography variant="h5" sx={{ color: 'white', fontWeight: 'bold' }}>
                  {userName}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)', mt: 0.5 }}>
                  {userEmail}
                </Typography>
              </Box>
            </Box>
          </Box>

          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Informações Pessoais */}
              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    color: 'text.primary',
                    mb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <MdPerson style={{ color: 'var(--primary)', fontSize: 20 }} />
                  Informações Pessoais
                </Typography>
                <Box
                  sx={{
                    bgcolor: 'grey.50',
                    borderRadius: 2,
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Nome
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500, color: 'text.primary', mt: 0.5 }}>
                        {userName}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      sx={{
                        minWidth: 'auto',
                        p: 1,
                        color: 'text.secondary',
                        '&:hover': { bgcolor: 'grey.200' },
                      }}
                    >
                      <MdEdit size={20} />
                    </Button>
                  </Box>

                  <Box
                    sx={{
                      borderTop: '1px solid',
                      borderColor: 'grey.200',
                      pt: 2,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          Email
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500, color: 'text.primary', mt: 0.5 }}>
                          {userEmail}
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        sx={{
                          minWidth: 'auto',
                          p: 1,
                          color: 'text.secondary',
                          '&:hover': { bgcolor: 'grey.200' },
                        }}
                      >
                        <MdEdit size={20} />
                      </Button>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      borderTop: '1px solid',
                      borderColor: 'grey.200',
                      pt: 2,
                    }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        ID do Usuário
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'monospace',
                          color: 'text.secondary',
                          mt: 0.5,
                        }}
                      >
                        {user.getId()}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>

              {/* Segurança */}
              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    color: 'text.primary',
                    mb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <MdLock style={{ color: 'var(--primary)', fontSize: 20 }} />
                  Segurança
                </Typography>
                <Box
                  sx={{
                    bgcolor: 'grey.50',
                    borderRadius: 2,
                    p: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Senha
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500, color: 'text.primary', mt: 0.5 }}>
                        ••••••••••••
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'white',
                        '&:hover': { bgcolor: 'primary.dark' },
                        textTransform: 'none',
                        fontWeight: 500,
                      }}
                    >
                      Alterar Senha
                    </Button>
                  </Box>
                </Box>
              </Box>

              {/* Ações */}
              <Box sx={{ display: 'flex', gap: 2, pt: 2 }}>
                <Button
                  variant="contained"
                  sx={{
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'primary.dark' },
                    textTransform: 'none',
                    fontWeight: 500,
                  }}
                >
                  Salvar Alterações
                </Button>
                <Button
                  variant="outlined"
                  sx={{
                    borderColor: 'grey.300',
                    color: 'text.secondary',
                    '&:hover': { bgcolor: 'grey.100', borderColor: 'grey.400' },
                    textTransform: 'none',
                    fontWeight: 500,
                  }}
                >
                  Cancelar
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function PerfilPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <PerfilContent />
    </Suspense>
  )
}

