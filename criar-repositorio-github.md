# Como Criar o Repositório no GitHub

## Opção Mais Fácil: Via Web (Recomendado)

### Passo 1: Preparar o repositório local

Execute no PowerShell:

```powershell
# Inicializar Git (se ainda não fez)
git init

# Adicionar todos os arquivos
git add .

# Fazer commit inicial
git commit -m "Initial commit: Migração Flutter para Next.js - Jiffy Gestor V2"

# Renomear branch para main
git branch -M main
```

### Passo 2: Criar repositório no GitHub

1. Acesse: **https://github.com/new**
2. Preencha:
   - **Repository name**: `jiffy-gestor-v2`
   - **Description**: `Sistema de gestão POS migrado de Flutter para Next.js`
   - **Visibility**: Escolha **Public** ou **Private**
   - **NÃO marque** "Add a README file" (já temos um)
   - **NÃO marque** "Add .gitignore" (já temos um)
   - **NÃO marque** "Choose a license"
3. Clique em **"Create repository"**

### Passo 3: Conectar e enviar código

Após criar o repositório, o GitHub mostrará instruções. Execute:

```powershell
# Adicionar o remote (substitua SEU_USUARIO pelo seu username do GitHub)
git remote add origin https://github.com/SEU_USUARIO/jiffy-gestor-v2.git

# Enviar o código
git push -u origin main
```

---

## Opção Alternativa: Instalar GitHub CLI

Se preferir usar o GitHub CLI no futuro:

1. **Instalar GitHub CLI:**
   - Download: https://cli.github.com/
   - Ou via winget: `winget install --id GitHub.cli`

2. **Autenticar:**
   ```powershell
   gh auth login
   ```

3. **Criar repositório:**
   ```powershell
   gh repo create jiffy-gestor-v2 --public --source=. --remote=origin --push
   ```

---

## Verificar se está tudo certo

Após fazer o push, verifique:

```powershell
git remote -v
git status
```

O repositório estará disponível em: `https://github.com/SEU_USUARIO/jiffy-gestor-v2`

