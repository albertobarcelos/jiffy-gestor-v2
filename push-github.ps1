# Script para conectar e enviar código para GitHub
Write-Host "=== Conectando ao GitHub ===" -ForegroundColor Cyan
Write-Host ""

# Verificar se git está inicializado
if (-not (Test-Path .git)) {
    Write-Host "Inicializando Git..." -ForegroundColor Yellow
    git init
}

# Verificar se já existe remote
$remoteExists = git remote get-url origin 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Adicionando remote..." -ForegroundColor Yellow
    git remote add origin https://github.com/albertobarcelos/jiffy-gestor-v2.git
    Write-Host "✓ Remote adicionado" -ForegroundColor Green
} else {
    Write-Host "✓ Remote já configurado" -ForegroundColor Green
    Write-Host "  URL: $remoteExists" -ForegroundColor Gray
}

Write-Host ""

# Verificar status
Write-Host "Verificando status..." -ForegroundColor Yellow
$status = git status --porcelain
if ($status) {
    Write-Host "Adicionando arquivos..." -ForegroundColor Yellow
    git add .
    Write-Host "✓ Arquivos adicionados" -ForegroundColor Green
} else {
    Write-Host "✓ Nenhuma alteração pendente" -ForegroundColor Green
}

# Verificar se há commits
$hasCommits = git log --oneline -1 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Criando commit inicial..." -ForegroundColor Yellow
    git commit -m "Initial commit: Migração Flutter para Next.js - Jiffy Gestor V2"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Commit criado" -ForegroundColor Green
    } else {
        Write-Host "✗ Erro ao criar commit" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✓ Já existe commit" -ForegroundColor Green
}

# Renomear branch para main
Write-Host "Configurando branch..." -ForegroundColor Yellow
git branch -M main
Write-Host "✓ Branch configurada como 'main'" -ForegroundColor Green

Write-Host ""
Write-Host "Enviando código para GitHub..." -ForegroundColor Yellow
Write-Host ""

# Fazer push
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== ✓ SUCESSO! ===" -ForegroundColor Green
    Write-Host "Repositório: https://github.com/albertobarcelos/jiffy-gestor-v2" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "=== ✗ ERRO ===" -ForegroundColor Red
    Write-Host "Verifique se você está autenticado no GitHub" -ForegroundColor Yellow
    Write-Host "Ou execute: git push -u origin main" -ForegroundColor Yellow
}

Write-Host ""

