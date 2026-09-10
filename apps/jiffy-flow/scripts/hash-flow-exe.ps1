param(
    [Parameter(Mandatory = $true)]
    [string]$Path
)

$item = Get-Item -LiteralPath $Path
$hash = (Get-FileHash -LiteralPath $item.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
Write-Output $hash
