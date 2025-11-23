# Script para fazer push da branch Fix_Kanbam_Fiscal
Write-Host "=== Push Branch Fix_Kanbam_Fiscal ===" -ForegroundColor Cyan
Write-Host ""

# Verificar status
Write-Host "Verificando status do Git..." -ForegroundColor Yellow
$status = git status --short
if ($status) {
    Write-Host "Arquivos modificados:" -ForegroundColor Green
    git status --short
    Write-Host ""
} else {
    Write-Host "Nenhuma alteração pendente" -ForegroundColor Yellow
}

# Verificar branch atual
Write-Host "Verificando branch atual..." -ForegroundColor Yellow
$currentBranch = git branch --show-current
Write-Host "Branch atual: $currentBranch" -ForegroundColor Cyan
Write-Host ""

# Verificar se a branch Fix_Kanbam_Fiscal existe
$branchExists = git branch --list Fix_Kanbam_Fiscal
if (-not $branchExists) {
    Write-Host "Criando branch Fix_Kanbam_Fiscal..." -ForegroundColor Yellow
    git checkout -b Fix_Kanbam_Fiscal
} else {
    Write-Host "Alternando para branch Fix_Kanbam_Fiscal..." -ForegroundColor Yellow
    git checkout Fix_Kanbam_Fiscal
}

Write-Host ""

# Adicionar todas as alterações
Write-Host "Adicionando alterações..." -ForegroundColor Yellow
git add .

# Verificar se há algo para commitar
$statusAfterAdd = git status --short
if ($statusAfterAdd) {
    Write-Host "Criando commit..." -ForegroundColor Yellow
    git commit -m "fix: Melhorias no design do Kanban Fiscal Flow - Header compacto e ajustes visuais"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Commit criado com sucesso" -ForegroundColor Green
        Write-Host ""
        
        # Fazer push
        Write-Host "Fazendo push para origin/Fix_Kanbam_Fiscal..." -ForegroundColor Yellow
        git push -u origin Fix_Kanbam_Fiscal
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "=== ✓ SUCESSO! ===" -ForegroundColor Green
            Write-Host "Push realizado com sucesso!" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "=== ✗ ERRO NO PUSH ===" -ForegroundColor Red
            Write-Host "Verifique se você está autenticado no GitHub" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✗ Erro ao criar commit" -ForegroundColor Red
    }
} else {
    Write-Host "Nenhuma alteração para commitar" -ForegroundColor Yellow
}

Write-Host ""

