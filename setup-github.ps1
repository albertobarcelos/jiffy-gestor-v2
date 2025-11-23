# Script para configurar repositório GitHub
Write-Host "=== Configurando Repositório GitHub ===" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar/Inicializar Git
Write-Host "1. Verificando Git..." -ForegroundColor Yellow
if (Test-Path .git) {
    Write-Host "   ✓ Git já está inicializado" -ForegroundColor Green
} else {
    Write-Host "   Inicializando Git..." -ForegroundColor Yellow
    git init
    Write-Host "   ✓ Git inicializado" -ForegroundColor Green
}

# 2. Verificar GitHub CLI
Write-Host "`n2. Verificando GitHub CLI..." -ForegroundColor Yellow
$ghInstalled = Get-Command gh -ErrorAction SilentlyContinue
if ($ghInstalled) {
    Write-Host "   ✓ GitHub CLI está instalado" -ForegroundColor Green
    
    # Verificar autenticação
    Write-Host "`n3. Verificando autenticação..." -ForegroundColor Yellow
    $authStatus = gh auth status 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✓ Autenticado no GitHub" -ForegroundColor Green
        
        # Adicionar arquivos e fazer commit
        Write-Host "`n4. Preparando arquivos..." -ForegroundColor Yellow
        git add .
        $commitExists = git log --oneline -1 2>&1
        if ($LASTEXITCODE -ne 0) {
            git commit -m "Initial commit: Migração Flutter para Next.js - Jiffy Gestor V2"
            Write-Host "   ✓ Commit inicial criado" -ForegroundColor Green
        } else {
            Write-Host "   ✓ Já existe commit" -ForegroundColor Green
        }
        
        # Criar repositório no GitHub
        Write-Host "`n5. Criando repositório no GitHub..." -ForegroundColor Yellow
        gh repo create jiffy-gestor-v2 --public --source=. --remote=origin --push
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✓ Repositório criado e código enviado!" -ForegroundColor Green
            Write-Host "`n=== Concluído! ===" -ForegroundColor Cyan
            Write-Host "Repositório: https://github.com/$(gh api user --jq .login)/jiffy-gestor-v2" -ForegroundColor Cyan
        } else {
            Write-Host "   ✗ Erro ao criar repositório" -ForegroundColor Red
            Write-Host "   Verifique se já existe um repositório com esse nome" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ✗ Não autenticado" -ForegroundColor Red
        Write-Host "   Execute: gh auth login" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ✗ GitHub CLI não está instalado" -ForegroundColor Red
    Write-Host "`n   Instale o GitHub CLI:" -ForegroundColor Yellow
    Write-Host "   https://cli.github.com/" -ForegroundColor Cyan
    Write-Host "`n   Ou use a opção web:" -ForegroundColor Yellow
    Write-Host "   1. Acesse: https://github.com/new" -ForegroundColor Cyan
    Write-Host "   2. Crie o repositório 'jiffy-gestor-v2'" -ForegroundColor Cyan
    Write-Host "   3. Execute os comandos que aparecerão na tela" -ForegroundColor Cyan
}

Write-Host ""

