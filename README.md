# Jiffy Gestor V2 - Next.js

Sistema de gestão empresarial (ERP) desenvolvido com Next.js 15, TypeScript e Clean Architecture.

## 🏗️ Arquitetura

O projeto segue os princípios de **Clean Architecture** com separação em camadas:

```
src/
├── domain/              # Camada de Domínio
│   ├── entities/       # Entidades de negócio (User, Auth, etc)
│   ├── repositories/   # Interfaces de repositórios
│   └── value-objects/  # Value Objects
│
├── application/        # Camada de Aplicação
│   ├── use-cases/     # Casos de uso (LoginUseCase, etc)
│   └── dto/           # Data Transfer Objects
│
├── infrastructure/     # Camada de Infraestrutura
│   ├── api/           # Cliente HTTP
│   └── database/      # Implementações de repositórios
│
└── presentation/       # Camada de Apresentação
    ├── components/    # Componentes React
    ├── stores/        # Estado global (Zustand)
    └── hooks/         # Custom Hooks
```

## 🚀 Início Rápido

### Instalação

```bash
npm install
```

### Desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

### Build

```bash
npm run build
npm start
```

## 📦 Dependências Principais

- **Next.js 15** - Framework React
- **TypeScript** - Tipagem estática
- **Zustand** - Gerenciamento de estado
- **Zod** - Validação de schemas
- **Tailwind CSS** - Estilização

## 🔐 Autenticação

O fluxo de login está implementado seguindo Clean Architecture:

1. **Domain**: Entidades `User` e `Auth`
2. **Application**: `LoginUseCase` orquestra a lógica
3. **Infrastructure**: `AuthRepository` comunica com API externa
4. **Presentation**: `LoginForm` e `authStore` (Zustand)

### Endpoint da API

O login faz requisição para:
```
POST /auth/login/usuario-gestor
Body: { "username": "...", "password": "..." }
Response: { "accessToken": "..." }
```

Configure a URL base da API em `.env.local`:
```
NEXT_PUBLIC_EXTERNAL_API_BASE_URL=https://sua-api.com
```

## 📁 Estrutura de Pastas

```
app/
├── (auth)/           # Grupo de rotas de autenticação
│   └── login/       # Página de login
├── api/              # API Routes
│   └── auth/        # Rotas de autenticação
└── layout.tsx        # Layout raiz

src/
├── domain/           # Regras de negócio
├── application/      # Casos de uso
├── infrastructure/   # Implementações técnicas
└── presentation/     # UI e interação
```

## 🎨 Design

O design da página de login foi baseado no projeto Flutter original, mantendo:
- Layout responsivo (vídeo/imagem à esquerda em desktop)
- Formulário com backdrop blur
- Logo e cores do Jiffy Gestor

## 🔧 Configuração

### Variáveis de Ambiente

Crie um arquivo `.env.local`:

```env
NEXT_PUBLIC_EXTERNAL_API_BASE_URL=https://api.exemplo.com
```

## 📝 Próximos Passos

- [ ] Implementar dashboard
- [ ] Adicionar testes unitários
- [ ] Implementar refresh token
- [ ] Adicionar tratamento de erros global
- [ ] Implementar notificações toast

## 📚 Documentação

Consulte `MELHORES_PRATICAS_CLEAN_CODE_NEXTJS.md` para as práticas de desenvolvimento.

