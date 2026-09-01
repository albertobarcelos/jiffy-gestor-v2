# Gera o Setup NSIS do Fredy e a arvore local do bucket R2 `jiffy-flow`.
#
#   .\scripts\package-flow.ps1 -GestorUrl "https://app.jiffy.run"
#   .\scripts\package-flow.ps1 -GestorUrl "https://app.jiffy.run" -R2PublicBase "https://pub-xxxx.r2.dev"
#
# Pastas no bucket (ver docs/arquitetura-jiffy/4.infrastructure/JIFFY_FLOW_R2.md):
#   brand/  stable/  releases/{versao}/

param(
    [Parameter(Mandatory = $true)]
    [string]$GestorUrl,
    [string]$R2PublicBase = $env:JIFFY_FLOW_R2_PUBLIC_BASE,
    [switch]$AllowDevUrl
)

$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root

$origem = $GestorUrl.Trim().TrimEnd("/")
if ([string]::IsNullOrWhiteSpace($origem)) {
    throw "GestorUrl vazia."
}
if (-not $AllowDevUrl -and ($origem -match "localhost|127\.0\.0\.1")) {
    throw "Recusado localhost. Use -AllowDevUrl so em teste."
}

$r2Base = ""
if ($R2PublicBase) {
    $r2Base = $R2PublicBase.Trim().TrimEnd("/")
}

$Version = (Get-Content (Join-Path $Root "src-tauri\Cargo.toml") -Raw |
    Select-String -Pattern '(?m)^version\s*=\s*"([^"]+)"').Matches[0].Groups[1].Value
if (-not $Version) {
    throw "versao nao encontrada em Cargo.toml"
}

$env:GESTOR_PEDIDOS_URL = $origem
if ($r2Base) {
    $env:JIFFY_FLOW_R2_PUBLIC_BASE = $r2Base
}

Write-Host "=== Fredy $Version ==="
Write-Host "Gestor gravado: $origem"
if ($r2Base) {
    Write-Host "R2 publico:     $r2Base"
} else {
    Write-Host "aviso: sem -R2PublicBase. Manifesto fica com placeholder. Ligue o acesso publico do bucket jiffy-flow."
}

npm run tauri:build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$nsisDir = Join-Path $Root "src-tauri\target\release\bundle\nsis"
$setupSrc = Get-ChildItem -LiteralPath $nsisDir -Filter "*-setup.exe" -ErrorAction Stop |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
if (-not $setupSrc) {
    throw "NSIS nao gerou setup em $nsisDir"
}

$dist = Join-Path $Root "dist"
New-Item -ItemType Directory -Force -Path $dist | Out-Null
$setupDest = Join-Path $dist "Fredy-$Version-setup.exe"
$setupStable = Join-Path $dist "FredySetup.exe"
Copy-Item -LiteralPath $setupSrc.FullName -Destination $setupDest -Force
Copy-Item -LiteralPath $setupSrc.FullName -Destination $setupStable -Force

$exeSrc = Join-Path $Root "src-tauri\target\release\Fredy.exe"
if (-not (Test-Path $exeSrc)) {
    $exeSrc = Join-Path $Root "src-tauri\target\release\jiffy-flow.exe"
}
if (-not (Test-Path $exeSrc)) {
    $exeSrc = Get-ChildItem (Join-Path $Root "src-tauri\target\release") -Filter "*.exe" |
        Where-Object { $_.Name -notmatch "setup" } |
        Select-Object -First 1 -ExpandProperty FullName
}
$exeDest = Join-Path $dist "Fredy.exe"
if ($exeSrc -and (Test-Path $exeSrc)) {
    Copy-Item -LiteralPath $exeSrc -Destination $exeDest -Force
}

function Find-SignTool {
    $cmd = Get-Command signtool.exe -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $kits = Join-Path ${env:ProgramFiles(x86)} "Windows Kits\10\bin"
    if (Test-Path $kits) {
        $found = Get-ChildItem $kits -Recurse -Filter signtool.exe -ErrorAction SilentlyContinue |
            Where-Object { $_.FullName -match "x64" } |
            Select-Object -First 1
        if ($found) { return $found.FullName }
    }
    return $null
}

$signTool = Find-SignTool
$thumb = $env:FLOW_SIGN_THUMBPRINT
if (-not $thumb) { $thumb = $env:AGENT_SIGN_THUMBPRINT }
$pfx = $env:FLOW_SIGN_PFX
if (-not $pfx) { $pfx = $env:AGENT_SIGN_PFX }

if ($signTool -and ($thumb -or $pfx)) {
    Write-Host "=== Authenticode ==="
    $targets = @($setupDest)
    if (Test-Path $exeDest) { $targets += $exeDest }
    foreach ($file in $targets) {
        if ($thumb) {
            & $signTool sign /fd SHA256 /td SHA256 /tr "http://timestamp.digicert.com" /sha1 $thumb $file
        } else {
            & $signTool sign /fd SHA256 /td SHA256 /tr "http://timestamp.digicert.com" /f $pfx /p $env:FLOW_SIGN_PFX_PASSWORD $file
        }
        if ($LASTEXITCODE -ne 0) { throw "signtool falhou em $file" }
    }
} else {
    Write-Host "aviso: Setup sem Authenticode (piloto). SmartScreen pode avisar."
}

if (-not (Test-Path $exeDest)) {
    throw "exe de release nao encontrado"
}

$hash = (Get-FileHash -LiteralPath $exeDest -Algorithm SHA256).Hash.ToLowerInvariant()
$exeUrl = if ($r2Base) {
    "$r2Base/releases/$Version/Fredy.exe"
} else {
    "DEFINIR_JIFFY_FLOW_R2_PUBLIC_BASE/releases/$Version/Fredy.exe"
}

$manifest = [ordered]@{
    schemaVersion = 1
    channel       = "stable"
    latest        = [ordered]@{
        version         = $Version
        minAgentVersion = "0.1.0"
        url             = $exeUrl
        sha256          = $hash
        notes           = "Fredy $Version - gestor de pedidos (app.jiffy.run)"
    }
}
$manifestJson = $manifest | ConvertTo-Json -Depth 5
$manifestPath = Join-Path $Root "docs\update-manifest.stable.json"
[System.IO.File]::WriteAllText($manifestPath, $manifestJson + "`n")

$r2 = Join-Path $dist "r2"
$brandDir = Join-Path $r2 "brand"
$stableDir = Join-Path $r2 "stable"
$releaseDir = Join-Path $r2 "releases\$Version"
New-Item -ItemType Directory -Force -Path $brandDir, $stableDir, $releaseDir | Out-Null

Copy-Item -LiteralPath (Join-Path $Root "brand\logo.png") -Destination (Join-Path $brandDir "logo.png") -Force
Copy-Item -LiteralPath (Join-Path $Root "brand\icon.png") -Destination (Join-Path $brandDir "icon.png") -Force
Copy-Item -LiteralPath $setupStable -Destination (Join-Path $stableDir "FredySetup.exe") -Force
Copy-Item -LiteralPath $manifestPath -Destination (Join-Path $stableDir "update-manifest.stable.json") -Force
Copy-Item -LiteralPath $exeDest -Destination (Join-Path $releaseDir "Fredy.exe") -Force

Write-Host "sha256 exe: $hash"
Write-Host "ok"
Write-Host "r2 tree: $r2"
Write-Host "  brand/logo.png"
Write-Host "  brand/icon.png"
Write-Host "  stable/FredySetup.exe"
Write-Host "  stable/update-manifest.stable.json"
Write-Host "  releases/$Version/Fredy.exe"
