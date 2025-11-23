# 🚀 Setup do Projeto - Jiffy Gestor V2

## ✅ Estrutura Criada

A estrutura completa do projeto Next.js foi criada seguindo **Clean Architecture** e as melhores práticas:

### 📁 Estrutura de Pastas

```
jiffy-gestor-v2/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx         # Página de login
│   ├── api/
│   │   └── auth/
│   │       └── login/
│   │           └── route.ts     # API route de login
│   ├── dashboard/
│   │   └── page.tsx             # Dashboard (placeholder)
│   ├── layout.tsx                # Layout raiz
│   ├── page.tsx                 # Home (redireciona para login)
│   └── globals.css               # Estilos globais
│
├── src/
│   ├── domain/                  # Camada de Domínio
│   │   ├── entities/
│   │   │   ├── User.ts          # Entidade User
│   │   │   └── Auth.ts          # Entidade Auth
│   │   └── repositories/
│   │       └── IAuthRepository.ts # Interface do repositório
│   │
│   ├── application/             # Camada de Aplicação
│   │   ├── dto/
│   │   │   └── LoginDTO.ts      # DTO de login com validação Zod
│   │   └── use-cases/
│   │       └── auth/
│   │           └── LoginUseCase.ts # Caso de uso de login
│   │
│   ├── infrastructure/          # Camada de Infraestrutura
│   │   ├── api/
│   │   │   └── apiClient.ts     # Cliente HTTP
│   │   └── database/
│   │       └── repositories/
│   │           └── AuthRepository.ts # Implementação do repositório
│   │
│   ├── presentation/            # Camada de Apresentação
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   │   ├── Button.tsx   # Componente de botão
│   │   │   │   └── Input.tsx    # Componente de input
│   │   │   └── features/
│   │   │       └── auth/
│   │   │           └── LoginForm.tsx # Formulário de login
│   │   └── stores/
│   │       └── authStore.ts     # Store Zustand de autenticação
│   │
│   └── shared/
│       └── utils/
│           └── cn.ts            # Utilitário para classes Tailwind
│
├── public/
│   └── images/                  # Imagens (copiar do Flutter)
│
├── middleware.ts                 # Middleware de autenticação
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
└── README.md
```

## 🔧 Configuração Necessária

### 1. Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# URL base da API externa (backend do Flutter)
NEXT_PUBLIC_EXTERNAL_API_BASE_URL=https://sua-api.com
```

### 2. Imagens

Copie as seguintes imagens do projeto Flutter para `public/images/`:

- `logo-branco.png` - Logo do Jiffy Gestor
- `fundo-login.jpeg` - Imagem de fundo do login

**Localização no Flutter:**
- `jiffy-admin/assets/images/logo-branco.png`
- `jiffy-admin/assets/images/fundo-login.jpeg`

### 3. Instalação de Dependências

```bash
npm install
```

## 🎯 Fluxo de Login Implementado

### Arquitetura

1. **Domain Layer** (`src/domain/`)
   - `User`: Entidade de usuário com validação
   - `Auth`: Entidade de autenticação com expiração
   - `IAuthRepository`: Interface do repositório (DIP)

2. **Application Layer** (`src/application/`)
   - `LoginDTO`: DTO com validação Zod
   - `LoginUseCase`: Orquestra a lógica de login

3. **Infrastructure Layer** (`src/infrastructure/`)
   - `ApiClient`: Cliente HTTP genérico
   - `AuthRepository`: Implementação que chama API externa

4. **Presentation Layer** (`src/presentation/`)
   - `LoginForm`: Componente de formulário
   - `authStore`: Estado global com Zustand
   - `Button` e `Input`: Componentes UI reutilizáveis

### Fluxo de Dados

```
LoginForm (Client Component)
    ↓
POST /api/auth/login (API Route)
    ↓
LoginUseCase.execute()
    ↓
AuthRepository.login()
    ↓
ApiClient.post('/auth/login/usuario-gestor')
    ↓
API Externa (Backend Flutter)
    ↓
Retorna accessToken
    ↓
Auth.create() → authStore.login()
    ↓
Redireciona para /dashboard
```

## 🚦 Como Testar

1. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

2. **Acesse:** http://localhost:3000

3. **A página inicial redireciona para `/login`**

4. **Teste o login:**
   - Preencha email e senha
   - Clique em "Acessar"
   - O sistema faz requisição para a API externa
   - Em caso de sucesso, redireciona para `/dashboard`

## 📝 Próximos Passos

- [ ] Copiar imagens do projeto Flutter
- [ ] Configurar URL da API externa
- [ ] Implementar dashboard completo
- [ ] Adicionar tratamento de erros global
- [ ] Implementar refresh token
- [ ] Adicionar testes unitários
- [ ] Implementar notificações toast

## 🔍 Endpoint da API

O login faz requisição para:

```
POST {NEXT_PUBLIC_EXTERNAL_API_BASE_URL}/auth/login/usuario-gestor

Body:
{
  "username": "email@exemplo.com",
  "password": "senha123"
}

Response:
{
  "accessToken": "jwt-token-here"
}
```

## ✨ Características Implementadas

✅ Clean Architecture com 4 camadas  
✅ Princípios SOLID aplicados  
✅ TypeScript com tipagem forte  
✅ Validação com Zod  
✅ Estado global com Zustand  
✅ Componentes reutilizáveis  
✅ Middleware de autenticação  
✅ API Routes do Next.js  
✅ Design responsivo  
✅ Tailwind CSS  

## 🐛 Troubleshooting

### Erro: "Cannot find module"
Execute `npm install` novamente.

### Erro: "API base URL not configured"
Crie o arquivo `.env.local` com `NEXT_PUBLIC_EXTERNAL_API_BASE_URL`.

### Imagens não aparecem
Certifique-se de copiar as imagens para `public/images/`.

